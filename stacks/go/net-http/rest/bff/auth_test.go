package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// resetStores clears all in-memory state and session data between tests.
func resetStores() {
	states.mu.Lock()
	states.data = make(map[string]time.Time)
	states.mu.Unlock()

	sessions.mu.Lock()
	sessions.data = make(map[string]sessionEntry)
	sessions.mu.Unlock()
}

func useSessionStore(t *testing.T, ttl time.Duration, now func() time.Time) func() {
	t.Helper()

	sessions.stop()
	sessions = newSessionStore(ttl, now)
	resetStores()

	return func() {
		sessions.stop()
		sessions = newSessionStore(resolveSessionTTL(), time.Now)
		resetStores()
	}
}

// captureLogOutput temporarily redirects the logger output to a buffer.
func captureLogOutput(t *testing.T, fn func()) string {
	t.Helper()

	var buf bytes.Buffer
	origWriter := log.Writer()
	origFlags := log.Flags()
	log.SetOutput(&buf)
	log.SetFlags(0)
	defer func() {
		log.SetOutput(origWriter)
		log.SetFlags(origFlags)
	}()

	fn()
	return buf.String()
}

// --- stateStore ---

func TestStateStoreCreateConsume(t *testing.T) {
	resetStores()

	state, err := states.create()
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if state == "" {
		t.Fatal("expected non-empty state")
	}
	if !states.consume(state) {
		t.Error("expected consume to succeed")
	}
}

func TestStateStoreSingleUse(t *testing.T) {
	resetStores()

	state, err := states.create()
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if !states.consume(state) {
		t.Fatal("first consume should succeed")
	}
	if states.consume(state) {
		t.Error("second consume should fail (state is one-time use)")
	}
}

func TestStateStoreEmptyString(t *testing.T) {
	resetStores()

	if states.consume("") {
		t.Error("consuming empty state should return false")
	}
}

func TestStateStoreUnknown(t *testing.T) {
	resetStores()

	if states.consume("not-a-real-state") {
		t.Error("consuming unknown state should return false")
	}
}

func TestStateStoreExpired(t *testing.T) {
	resetStores()

	state, err := states.create()
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	states.mu.Lock()
	states.data[state] = time.Now().Add(-oauthStateMaxAge - time.Minute)
	states.mu.Unlock()

	if states.consume(state) {
		t.Error("consuming expired state should return false")
	}
}

// --- sessionStore ---

func TestSessionStoreCreateGetDelete(t *testing.T) {
	resetStores()

	user := &userInfo{Login: "testuser", ID: 1, Name: "Test User"}

	id, err := sessions.create(user)
	if err != nil {
		t.Fatalf("create session: %v", err)
	}
	if id == "" {
		t.Fatal("expected non-empty session ID")
	}

	got, ok := sessions.get(id)
	if !ok {
		t.Fatal("expected session to exist")
	}
	if got.Login != "testuser" {
		t.Errorf("expected login=testuser, got %s", got.Login)
	}

	sessions.delete(id)
	if _, ok := sessions.get(id); ok {
		t.Error("expected session to be deleted")
	}
}

func TestSessionStoreEmptyID(t *testing.T) {
	resetStores()

	if _, ok := sessions.get(""); ok {
		t.Error("empty session ID should return false")
	}
}

func TestSessionStoreExpiresSessions(t *testing.T) {
	now := time.Now()
	restore := useSessionStore(t, time.Minute, func() time.Time { return now })
	defer restore()

	user := &userInfo{Login: "expired"}
	id, err := sessions.create(user)
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	now = now.Add(2 * time.Minute)
	if _, ok := sessions.get(id); ok {
		t.Fatal("expected session to be expired and removed")
	}

	sessions.mu.Lock()
	count := len(sessions.data)
	sessions.mu.Unlock()
	if count != 0 {
		t.Fatalf("expected store to clean expired session, found %d entries", count)
	}
}

// --- generateHex ---

func TestGenerateHex(t *testing.T) {
	got, err := generateHex(16)
	if err != nil {
		t.Fatalf("generateHex: %v", err)
	}
	// 16 bytes → 32 hex chars
	if len(got) != 32 {
		t.Errorf("expected 32-char hex string, got len %d", len(got))
	}
}

func TestGenerateHexUnique(t *testing.T) {
	a, _ := generateHex(16)
	b, _ := generateHex(16)
	if a == b {
		t.Error("two generateHex calls should not return identical values")
	}
}

// --- resolveOAuthProviderName ---

func TestResolveOAuthProviderNameDefault(t *testing.T) {
	t.Setenv("OUR_IDP_OAUTH_PROVIDER", "")
	if got := resolveOAuthProviderName(); got != "none" {
		t.Errorf("expected none, got %s", got)
	}
}

func TestResolveOAuthProviderNameCaseInsensitive(t *testing.T) {
	t.Setenv("OUR_IDP_OAUTH_PROVIDER", "MOCK")
	if got := resolveOAuthProviderName(); got != "mock" {
		t.Errorf("expected mock, got %s", got)
	}
}

// --- registerAuthRoutes ---

func TestRegisterAuthRoutesNone(t *testing.T) {
	t.Setenv("OUR_IDP_OAUTH_PROVIDER", "none")
	mux := http.NewServeMux()
	registerAuthRoutes(mux)

	for _, path := range []string{"/auth/login", "/auth/me"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404 for %s when provider=none, got %d", path, w.Code)
		}
	}
}

func TestRegisterAuthRoutesUnknownProvider(t *testing.T) {
	t.Setenv("OUR_IDP_OAUTH_PROVIDER", "unsupported-provider")
	mux := http.NewServeMux()
	registerAuthRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unknown provider, got %d", w.Code)
	}
}

func TestRegisterAuthRoutesIncompleteConfig(t *testing.T) {
	t.Setenv("OUR_IDP_OAUTH_PROVIDER", "github")
	mux := http.NewServeMux()

	logs := captureLogOutput(t, func() {
		registerAuthRoutes(mux)
	})

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for /auth/login when config incomplete, got %d", w.Code)
	}
	if !strings.Contains(logs, "missing required configuration") {
		t.Fatalf("expected warning log for incomplete config, got: %s", logs)
	}
}

// --- /auth/login ---

func TestLoginHandlerRedirects(t *testing.T) {
	resetStores()

	cfg := &oauthConfig{
		authURL:  "https://provider.example.com/oauth/authorize",
		clientID: "test-client",
	}

	handler := makeLoginHandler(oauth2ConfigFrom(cfg))
	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Errorf("expected 302, got %d", w.Code)
	}

	loc := w.Header().Get("Location")
	if !strings.HasPrefix(loc, "https://provider.example.com/oauth/authorize?") {
		t.Errorf("unexpected redirect location: %s", loc)
	}
	if !strings.Contains(loc, "state=") {
		t.Error("redirect URL missing state parameter")
	}
	if !strings.Contains(loc, "response_type=code") {
		t.Error("redirect URL missing response_type=code")
	}
}

func TestLoginHandlerStoresPendingState(t *testing.T) {
	resetStores()

	cfg := &oauthConfig{authURL: "https://example.com/authorize"}
	handler := makeLoginHandler(oauth2ConfigFrom(cfg))
	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	// State should have been created and stored (store is non-empty)
	states.mu.Lock()
	count := len(states.data)
	states.mu.Unlock()
	if count != 1 {
		t.Errorf("expected 1 pending state after login, got %d", count)
	}
}

// --- /auth/callback ---

func TestCallbackHandlerMissingState(t *testing.T) {
	resetStores()

	cfg := &oauthConfig{}
	oauth2Cfg := oauth2ConfigFrom(cfg)
	handler := makeCallbackHandler(cfg, oauth2Cfg)
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=abc", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing state, got %d", w.Code)
	}
}

func TestCallbackHandlerInvalidState(t *testing.T) {
	resetStores()

	cfg := &oauthConfig{}
	oauth2Cfg := oauth2ConfigFrom(cfg)
	handler := makeCallbackHandler(cfg, oauth2Cfg)
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=abc&state=bad-state", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid state, got %d", w.Code)
	}
}

func TestCallbackHandlerValidFlow(t *testing.T) {
	resetStores()

	// Mock token + userinfo backend.
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/oauth/token":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"mock-token","token_type":"bearer"}`))
		case "/userinfo":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"login":"alice","id":7,"name":"Alice","email":"alice@example.com"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer backend.Close()

	cfg := &oauthConfig{
		authURL:     backend.URL + "/oauth/authorize",
		tokenURL:    backend.URL + "/oauth/token",
		userinfoURL: backend.URL + "/userinfo",
	}

	// Create a valid state.
	state, err := states.create()
	if err != nil {
		t.Fatalf("create state: %v", err)
	}

	handler := makeCallbackHandler(cfg, oauth2ConfigFrom(cfg))
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=test-code&state="+state, nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Errorf("expected 302, got %d: %s", w.Code, w.Body.String())
	}

	// Verify the callback redirects to /.
	loc := w.Header().Get("Location")
	if loc != "/" {
		t.Errorf("expected redirect to /, got %s", loc)
	}

	// Verify idp_session cookie is set.
	var sessionCookie *http.Cookie
	for _, c := range w.Result().Cookies() {
		if c.Name == sessionCookieName {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil {
		t.Fatal("expected idp_session cookie to be set")
	}
	if !sessionCookie.HttpOnly {
		t.Error("cookie must be HttpOnly")
	}

	// Verify the session contains the user.
	user, ok := sessions.get(sessionCookie.Value)
	if !ok {
		t.Fatal("expected session to exist after callback")
	}
	if user.Login != "alice" {
		t.Errorf("expected login=alice, got %s", user.Login)
	}
}

func TestCallbackHandlerStateIsOneTimeUse(t *testing.T) {
	resetStores()

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/oauth/token":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"tok"}`))
		case "/userinfo":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"login":"bob"}`))
		}
	}))
	defer backend.Close()

	cfg := &oauthConfig{
		tokenURL:    backend.URL + "/oauth/token",
		userinfoURL: backend.URL + "/userinfo",
	}

	state, _ := states.create()

	// First call succeeds.
	handler := makeCallbackHandler(cfg, oauth2ConfigFrom(cfg))
	req1 := httptest.NewRequest(http.MethodGet, "/auth/callback?code=c1&state="+state, nil)
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, req1)
	if w1.Code != http.StatusFound {
		t.Fatalf("first callback should succeed with 302, got %d", w1.Code)
	}

	// Replay with the same state must be rejected.
	req2 := httptest.NewRequest(http.MethodGet, "/auth/callback?code=c2&state="+state, nil)
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)
	if w2.Code != http.StatusBadRequest {
		t.Errorf("expected 400 on state replay, got %d", w2.Code)
	}
}

func TestCallbackHandlerTokenExchangeRejected(t *testing.T) {
	resetStores()

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/oauth/token" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"invalid_grant","error_description":"bad code"}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer backend.Close()

	cfg := &oauthConfig{
		tokenURL:    backend.URL + "/oauth/token",
		userinfoURL: backend.URL + "/userinfo",
	}
	state, err := states.create()
	if err != nil {
		t.Fatalf("create state: %v", err)
	}

	handler := makeCallbackHandler(cfg, oauth2ConfigFrom(cfg))
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=bad-code&state="+state, nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusBadGateway {
		t.Errorf("expected 502 for token error, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCallbackHandlerUserinfoError(t *testing.T) {
	resetStores()

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/oauth/token":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"tok","token_type":"bearer"}`))
		case "/userinfo":
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`upstream failure`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer backend.Close()

	cfg := &oauthConfig{
		tokenURL:    backend.URL + "/oauth/token",
		userinfoURL: backend.URL + "/userinfo",
	}
	state, err := states.create()
	if err != nil {
		t.Fatalf("create state: %v", err)
	}

	handler := makeCallbackHandler(cfg, oauth2ConfigFrom(cfg))
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=ok&state="+state, nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusBadGateway {
		t.Errorf("expected 502 for userinfo error, got %d: %s", w.Code, w.Body.String())
	}
}

// --- /auth/me ---

func TestMeHandlerNoCookie(t *testing.T) {
	resetStores()

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	w := httptest.NewRecorder()
	handleMe(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMeHandlerInvalidSession(t *testing.T) {
	resetStores()

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "nonexistent-session"})
	w := httptest.NewRecorder()
	handleMe(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMeHandlerValidSession(t *testing.T) {
	resetStores()

	user := &userInfo{Login: "carol", ID: 99, Name: "Carol"}
	sessionID, err := sessions.create(user)
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: sessionID})
	w := httptest.NewRecorder()
	handleMe(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var got userInfo
	if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Login != "carol" {
		t.Errorf("expected login=carol, got %s", got.Login)
	}
}

func TestMeHandlerExpiredSession(t *testing.T) {
	now := time.Now()
	restore := useSessionStore(t, time.Minute, func() time.Time { return now })
	defer restore()

	user := &userInfo{Login: "eve"}
	sessionID, err := sessions.create(user)
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	now = now.Add(2 * time.Minute)

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: sessionID})
	w := httptest.NewRecorder()
	handleMe(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for expired session, got %d", w.Code)
	}

	if _, ok := sessions.get(sessionID); ok {
		t.Fatal("expected expired session to be removed")
	}
}

// --- /auth/logout ---

func TestLogoutClearsSession(t *testing.T) {
	resetStores()

	user := &userInfo{Login: "dave"}
	sessionID, _ := sessions.create(user)

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: sessionID})
	w := httptest.NewRecorder()
	handleLogout(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}

	// Session must be removed.
	if _, ok := sessions.get(sessionID); ok {
		t.Error("expected session to be deleted after logout")
	}

	// Cookie must be expired.
	var found bool
	for _, c := range w.Result().Cookies() {
		if c.Name == sessionCookieName {
			found = true
			if c.MaxAge != -1 {
				t.Errorf("expected MaxAge=-1 (expire), got %d", c.MaxAge)
			}
			break
		}
	}
	if !found {
		t.Error("expected idp_session cookie in logout response")
	}
}

func TestLogoutNoCookieIsGraceful(t *testing.T) {
	resetStores()

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	w := httptest.NewRecorder()
	handleLogout(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 even with no cookie, got %d", w.Code)
	}
}
