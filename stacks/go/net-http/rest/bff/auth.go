package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/oauth2"
)

const sessionCookieName = "idp_session"
const defaultSessionTTL = 60 * time.Minute
const sessionCleanupInterval = time.Minute

// oauthStateMaxAge is the maximum time a CSRF state value remains valid after
// /auth/login. Older values are rejected to limit replay windows.
const oauthStateMaxAge = 15 * time.Minute

// oauthConfig holds the OAuth 2.0 provider endpoints and credentials.
type oauthConfig struct {
	authURL      string
	tokenURL     string
	userinfoURL  string
	clientID     string
	clientSecret string
	redirectURL  string
}

// userInfo holds the normalized user profile returned by the provider.
type userInfo struct {
	Login     string `json:"login"`
	ID        int    `json:"id,omitempty"`
	Name      string `json:"name,omitempty"`
	Email     string `json:"email,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

// stateStore is a CSRF-safe one-time-use state store backed by crypto/rand.
type stateStore struct {
	mu   sync.Mutex
	data map[string]time.Time
}

type sessionEntry struct {
	user      *userInfo
	createdAt time.Time
}

// sessionStore maps session IDs to user profiles.
type sessionStore struct {
	mu     sync.Mutex
	data   map[string]sessionEntry
	ttl    time.Duration
	now    func() time.Time
	stopCh chan struct{}
}

// Package-level stores shared across handlers.
var (
	states   = &stateStore{data: make(map[string]time.Time)}
	sessions = newSessionStore(resolveSessionTTL(), time.Now)
)

// generateHex returns a cryptographically random hex string of 2*n characters.
func generateHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// create adds a new one-time state value to the store and returns it.
func (s *stateStore) create() (string, error) {
	state, err := generateHex(16)
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	s.data[state] = time.Now()
	s.mu.Unlock()
	return state, nil
}

// consume validates the state, enforces a maximum age, removes it from the
// store (one-time use), and returns false when empty, unknown, or expired.
func (s *stateStore) consume(state string) bool {
	if state == "" {
		return false
	}
	s.mu.Lock()
	created, ok := s.data[state]
	if !ok {
		s.mu.Unlock()
		return false
	}
	if time.Since(created) > oauthStateMaxAge {
		delete(s.data, state)
		s.mu.Unlock()
		return false
	}
	delete(s.data, state)
	s.mu.Unlock()
	return true
}

func resolveSessionTTL() time.Duration {
	raw := strings.TrimSpace(os.Getenv("OUR_IDP_SESSION_TTL_MINUTES"))
	if raw == "" {
		return defaultSessionTTL
	}

	minutes, err := strconv.ParseFloat(raw, 64)
	if err != nil || minutes <= 0 {
		return defaultSessionTTL
	}

	return time.Duration(minutes * float64(time.Minute))
}

func newSessionStore(ttl time.Duration, now func() time.Time) *sessionStore {
	if ttl <= 0 {
		ttl = defaultSessionTTL
	}
	if now == nil {
		now = time.Now
	}

	store := &sessionStore{
		data:   make(map[string]sessionEntry),
		ttl:    ttl,
		now:    now,
		stopCh: make(chan struct{}),
	}

	interval := sessionCleanupInterval
	if ttl < interval {
		interval = ttl
	}
	if interval > 0 {
		go store.startCleanup(interval)
	}

	return store
}

func (s *sessionStore) startCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.cleanupExpired()
		case <-s.stopCh:
			return
		}
	}
}

func (s *sessionStore) stop() {
	if s == nil || s.stopCh == nil {
		return
	}
	select {
	case <-s.stopCh:
		// already closed
	default:
		close(s.stopCh)
	}
}

func (s *sessionStore) cleanupExpired() {
	now := s.now()
	s.mu.Lock()
	for id, entry := range s.data {
		if now.Sub(entry.createdAt) > s.ttl {
			delete(s.data, id)
		}
	}
	s.mu.Unlock()
}

// create stores the user under a new random session ID and returns the ID.
func (s *sessionStore) create(user *userInfo) (string, error) {
	id, err := generateHex(16)
	if err != nil {
		return "", err
	}
	now := s.now()
	s.mu.Lock()
	for existingID, entry := range s.data {
		if now.Sub(entry.createdAt) > s.ttl {
			delete(s.data, existingID)
		}
	}
	s.data[id] = sessionEntry{user: user, createdAt: now}
	s.mu.Unlock()
	return id, nil
}

// get returns the user associated with id, or (nil, false) when absent.
func (s *sessionStore) get(id string) (*userInfo, bool) {
	if id == "" {
		return nil, false
	}
	now := s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.data[id]
	if !ok {
		return nil, false
	}
	if now.Sub(entry.createdAt) > s.ttl {
		delete(s.data, id)
		return nil, false
	}
	return entry.user, true
}

// delete removes a session from the store.
func (s *sessionStore) delete(id string) {
	s.mu.Lock()
	delete(s.data, id)
	s.mu.Unlock()
}

// resolveOAuthProviderName reads OUR_IDP_OAUTH_PROVIDER.
// Returns "none" when the variable is unset or empty.
func resolveOAuthProviderName() string {
	p := strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_PROVIDER"))
	if p == "" {
		return "none"
	}
	return strings.ToLower(p)
}

// resolveSecureCookie returns true when OUR_IDP_OAUTH_SECURE_COOKIE is set to
// "true" (case-insensitive). Default is false so that the mock provider and
// local HTTP development work without TLS. Enable in production deployments
// that use HTTPS.
func resolveSecureCookie() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_SECURE_COOKIE")), "true")
}

// isConfigComplete returns true when required OAuth credentials and redirect
// URL are all present.
func isConfigComplete(cfg *oauthConfig) bool {
	return cfg.clientID != "" && cfg.clientSecret != "" && cfg.redirectURL != ""
}

// oauth2ConfigFrom builds a golang.org/x/oauth2.Config from oauthConfig.
func oauth2ConfigFrom(cfg *oauthConfig) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.clientID,
		ClientSecret: cfg.clientSecret,
		RedirectURL:  cfg.redirectURL,
		Endpoint: oauth2.Endpoint{
			AuthURL:  cfg.authURL,
			TokenURL: cfg.tokenURL,
		},
	}
}

// buildMockOAuthConfig constructs an oauthConfig for the local mock provider.
// Endpoint URLs default to http://127.0.0.1:<OUR_IDP_OAUTH_MOCK_PORT|9000>/… but are
// individually overridable via OUR_IDP_OAUTH_AUTH_URL, OUR_IDP_OAUTH_TOKEN_URL,
// and OUR_IDP_OAUTH_USERINFO_URL.
func buildMockOAuthConfig() *oauthConfig {
	port := strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_MOCK_PORT"))
	if port == "" {
		port = "9000"
	}
	base := "http://127.0.0.1:" + port

	authURL := strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_AUTH_URL"))
	if authURL == "" {
		authURL = base + "/oauth/authorize"
	}
	tokenURL := strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_TOKEN_URL"))
	if tokenURL == "" {
		tokenURL = base + "/oauth/token"
	}
	userinfoURL := strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_USERINFO_URL"))
	if userinfoURL == "" {
		userinfoURL = base + "/userinfo"
	}

	return &oauthConfig{
		authURL:      authURL,
		tokenURL:     tokenURL,
		userinfoURL:  userinfoURL,
		clientID:     strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_CLIENT_ID")),
		clientSecret: strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_CLIENT_SECRET")),
		redirectURL:  strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_REDIRECT_URL")),
	}
}

// buildGitHubOAuthConfig constructs an oauthConfig for GitHub OAuth.
// Credentials are read from OUR_IDP_OAUTH_CLIENT_ID, OUR_IDP_OAUTH_CLIENT_SECRET,
// and OUR_IDP_OAUTH_REDIRECT_URL.
func buildGitHubOAuthConfig() *oauthConfig {
	return &oauthConfig{
		authURL:      "https://github.com/login/oauth/authorize",
		tokenURL:     "https://github.com/login/oauth/access_token",
		userinfoURL:  "https://api.github.com/user",
		clientID:     strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_CLIENT_ID")),
		clientSecret: strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_CLIENT_SECRET")),
		redirectURL:  strings.TrimSpace(os.Getenv("OUR_IDP_OAUTH_REDIRECT_URL")),
	}
}

// registerAuthRoutes adds the /auth/* routes to mux when OUR_IDP_OAUTH_PROVIDER
// is set to a value other than "none". It is a no-op for provider=none so that
// the default server behaviour is fully preserved.
func registerAuthRoutes(mux *http.ServeMux) {
	providerName := resolveOAuthProviderName()
	if providerName == "none" {
		return
	}

	var cfg *oauthConfig
	switch providerName {
	case "mock":
		cfg = buildMockOAuthConfig()
	case "github":
		cfg = buildGitHubOAuthConfig()
	default:
		return
	}

	if !isConfigComplete(cfg) {
		log.Printf("WARN auth provider=%s missing required configuration; skipping auth route registration", providerName)
		return
	}

	oauth2Cfg := oauth2ConfigFrom(cfg)
	mux.HandleFunc("GET /auth/login", makeLoginHandler(oauth2Cfg))
	mux.HandleFunc("GET /auth/callback", makeCallbackHandler(cfg, oauth2Cfg))
	mux.HandleFunc("POST /auth/logout", handleLogout)
	mux.HandleFunc("GET /auth/me", handleMe)
}

// makeLoginHandler returns an http.HandlerFunc that initiates the OAuth flow by
// generating a CSRF state value and redirecting to the provider authorization URL.
func makeLoginHandler(oauth2Cfg *oauth2.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		state, err := states.create()
		if err != nil {
			http.Error(w, "failed to generate state", http.StatusInternalServerError)
			return
		}

		authURL := oauth2Cfg.AuthCodeURL(state)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}

// exchangeCode exchanges an authorization code for an access token using
// golang.org/x/oauth2.
func exchangeCode(ctx context.Context, oauth2Cfg *oauth2.Config, code string) (string, error) {
	tok, err := oauth2Cfg.Exchange(ctx, code)
	if err != nil {
		return "", err
	}
	if tok.AccessToken == "" {
		return "", fmt.Errorf("empty access token in provider response")
	}
	return tok.AccessToken, nil
}

// fetchUserInfo retrieves the user profile from the provider's userinfo endpoint.
func fetchUserInfo(cfg *oauthConfig, accessToken string) (*userInfo, error) {
	req, err := http.NewRequest(http.MethodGet, cfg.userinfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo endpoint returned %d: %s",
			resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var u userInfo
	if err := json.Unmarshal(body, &u); err != nil {
		return nil, err
	}

	return &u, nil
}

// makeCallbackHandler returns an http.HandlerFunc that completes the OAuth flow:
// it validates the CSRF state, exchanges the code for a token, fetches the user
// profile, and sets an HttpOnly session cookie.
func makeCallbackHandler(cfg *oauthConfig, oauth2Cfg *oauth2.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		state := r.URL.Query().Get("state")
		code := r.URL.Query().Get("code")

		if !states.consume(state) {
			http.Error(w, "invalid or missing state", http.StatusBadRequest)
			return
		}

		if code == "" {
			http.Error(w, "missing code", http.StatusBadRequest)
			return
		}

		accessToken, err := exchangeCode(ctx, oauth2Cfg, code)
		if err != nil {
			var re *oauth2.RetrieveError
			if errors.As(err, &re) {
				http.Error(w, "token exchange rejected by authorization server",
					http.StatusBadGateway)
				return
			}
			http.Error(w, "token exchange failed", http.StatusBadGateway)
			return
		}

		user, err := fetchUserInfo(cfg, accessToken)
		if err != nil {
			http.Error(w, "failed to fetch user info", http.StatusBadGateway)
			return
		}

		sessionID, err := sessions.create(user)
		if err != nil {
			http.Error(w, "failed to create session", http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     sessionCookieName,
			Value:    sessionID,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			Path:     "/",
			Secure:   resolveSecureCookie(),
		})

		http.Redirect(w, r, "/", http.StatusFound)
	}
}

// handleLogout clears the session and expires the session cookie.
func handleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		sessions.delete(cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
		Secure:   resolveSecureCookie(),
	})

	w.WriteHeader(http.StatusNoContent)
}

// handleMe returns the authenticated user's profile from the session, or 401
// when no valid session exists.
func handleMe(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, ok := sessions.get(cookie.Value)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	writeJSON(w, user)
}
