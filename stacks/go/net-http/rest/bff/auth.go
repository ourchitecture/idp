package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const sessionCookieName = "idp_session"

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

// sessionStore maps session IDs to user profiles.
type sessionStore struct {
	mu   sync.Mutex
	data map[string]*userInfo
}

// Package-level stores shared across handlers.
var (
	states   = &stateStore{data: make(map[string]time.Time)}
	sessions = &sessionStore{data: make(map[string]*userInfo)}
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

// consume validates the state and removes it from the store (one-time use).
// Returns false when the state is empty or not found.
func (s *stateStore) consume(state string) bool {
	if state == "" {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.data[state]; !ok {
		return false
	}
	delete(s.data, state)
	return true
}

// create stores the user under a new random session ID and returns the ID.
func (s *sessionStore) create(user *userInfo) (string, error) {
	id, err := generateHex(16)
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	s.data[id] = user
	s.mu.Unlock()
	return id, nil
}

// get returns the user associated with id, or (nil, false) when absent.
func (s *sessionStore) get(id string) (*userInfo, bool) {
	if id == "" {
		return nil, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.data[id]
	return u, ok
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

// buildMockOAuthConfig constructs an oauthConfig for the local mock provider.
// Endpoint URLs default to http://127.0.0.1:<MOCK_OAUTH_PORT|9000>/… but are
// individually overridable via OUR_IDP_OAUTH_AUTH_URL, OUR_IDP_OAUTH_TOKEN_URL,
// and OUR_IDP_OAUTH_USERINFO_URL.
func buildMockOAuthConfig() *oauthConfig {
	port := strings.TrimSpace(os.Getenv("MOCK_OAUTH_PORT"))
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

	mux.HandleFunc("GET /auth/login", makeLoginHandler(cfg))
	mux.HandleFunc("GET /auth/callback", makeCallbackHandler(cfg))
	mux.HandleFunc("POST /auth/logout", handleLogout)
	mux.HandleFunc("GET /auth/me", handleMe)
}

// makeLoginHandler returns an http.HandlerFunc that initiates the OAuth flow by
// generating a CSRF state value and redirecting to the provider authorization URL.
func makeLoginHandler(cfg *oauthConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		state, err := states.create()
		if err != nil {
			http.Error(w, "failed to generate state", http.StatusInternalServerError)
			return
		}

		params := url.Values{}
		params.Set("response_type", "code")
		params.Set("state", state)
		if cfg.clientID != "" {
			params.Set("client_id", cfg.clientID)
		}
		if cfg.redirectURL != "" {
			params.Set("redirect_uri", cfg.redirectURL)
		}

		http.Redirect(w, r, cfg.authURL+"?"+params.Encode(), http.StatusFound)
	}
}

// tokenResponse is used to decode the token endpoint response.
type tokenResponse struct {
	AccessToken string `json:"access_token"`
}

// exchangeCode exchanges an authorization code for an access token.
func exchangeCode(cfg *oauthConfig, code string) (string, error) {
	params := url.Values{}
	params.Set("grant_type", "authorization_code")
	params.Set("code", code)
	if cfg.clientID != "" {
		params.Set("client_id", cfg.clientID)
	}
	if cfg.clientSecret != "" {
		params.Set("client_secret", cfg.clientSecret)
	}
	if cfg.redirectURL != "" {
		params.Set("redirect_uri", cfg.redirectURL)
	}

	req, err := http.NewRequest(http.MethodPost, cfg.tokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tok tokenResponse
	if err := json.Unmarshal(body, &tok); err != nil {
		return "", fmt.Errorf("decode token response: %w", err)
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

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo endpoint returned %d", resp.StatusCode)
	}

	var u userInfo
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return nil, err
	}

	return &u, nil
}

// makeCallbackHandler returns an http.HandlerFunc that completes the OAuth flow:
// it validates the CSRF state, exchanges the code for a token, fetches the user
// profile, and sets an HttpOnly session cookie.
func makeCallbackHandler(cfg *oauthConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		accessToken, err := exchangeCode(cfg, code)
		if err != nil {
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
