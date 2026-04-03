package dev.idp.mockoauth;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Mock OAuth 2.0 REST endpoints for automated contract testing.
 *
 * <p>All responses are deterministic and backed by {@link InMemoryTokenStore}. This controller is
 * <strong>never</strong> deployed to production and must not be used with real credentials or
 * sensitive data.
 *
 * <p>Endpoints:
 *
 * <ul>
 *   <li>{@code GET /oauth/authorize} – issues an authorization code and redirects to
 *       {@code redirect_uri}
 *   <li>{@code POST /oauth/token} – exchanges any code for the mock bearer token
 *   <li>{@code GET /userinfo} – returns deterministic mock user JSON
 *   <li>{@code GET /health} – IETF health check per draft-inadarei-api-health-check-06
 * </ul>
 */
@RestController
public class OAuthController {

  private final InMemoryTokenStore tokenStore;

  public OAuthController(InMemoryTokenStore tokenStore) {
    this.tokenStore = tokenStore;
  }

  /**
   * Mock OAuth authorization endpoint.
   *
   * <p>Immediately redirects back to {@code redirect_uri} with a generated {@code code} and the
   * supplied {@code state} value. No user interaction is simulated.
   *
   * @param redirectUri the callback URL (required)
   * @param state opaque state value forwarded verbatim to the callback
   * @param clientId ignored; present for protocol compatibility
   * @param responseType ignored; present for protocol compatibility
   * @return {@code 302 Found} to the redirect URI, or {@code 400 Bad Request} when
   *     {@code redirect_uri} is absent
   */
  @GetMapping("/oauth/authorize")
  public ResponseEntity<Void> authorize(
      @RequestParam(name = "redirect_uri", required = false) String redirectUri,
      @RequestParam(name = "state", required = false) String state,
      @RequestParam(name = "client_id", required = false) String clientId,
      @RequestParam(name = "response_type", required = false) String responseType) {

    if (redirectUri == null || redirectUri.isBlank()) {
      return ResponseEntity.badRequest().build();
    }

    String code = tokenStore.generateCode();
    UriComponentsBuilder uriBuilder =
        UriComponentsBuilder.fromUriString(redirectUri).queryParam("code", code);
    if (state != null) {
      uriBuilder.queryParam("state", state);
    }

    HttpHeaders headers = new HttpHeaders();
    headers.setLocation(uriBuilder.build().toUri());
    return new ResponseEntity<>(headers, HttpStatus.FOUND);
  }

  /**
   * Mock OAuth token endpoint.
   *
   * <p>Returns a deterministic bearer token regardless of the supplied {@code code},
   * {@code grant_type}, or client credentials. The response body follows the OAuth 2.0 token
   * response format (RFC 6749 §5.1).
   *
   * @return {@code 200 OK} with a JSON token response containing {@link
   *     InMemoryTokenStore#MOCK_ACCESS_TOKEN}
   */
  @PostMapping(
      value = "/oauth/token",
      consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, Object>> token(
      @RequestParam(name = "code", required = false) String code,
      @RequestParam(name = "grant_type", required = false) String grantType,
      @RequestParam(name = "client_id", required = false) String clientId,
      @RequestParam(name = "client_secret", required = false) String clientSecret,
      @RequestParam(name = "redirect_uri", required = false) String redirectUri) {

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("access_token", InMemoryTokenStore.MOCK_ACCESS_TOKEN);
    response.put("token_type", "bearer");
    response.put("scope", "read:user user:email");
    response.put("expires_in", 3600);
    return ResponseEntity.ok(response);
  }

  /**
   * Mock userinfo endpoint.
   *
   * <p>Returns a deterministic mock user JSON object that resembles the GitHub userinfo response
   * shape. The {@code Authorization} header is accepted but not validated.
   *
   * @param authorization the {@code Authorization} header (optional, not validated)
   * @return {@code 200 OK} with mock user JSON
   */
  @GetMapping(value = "/userinfo", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, Object>> userinfo(
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {

    Map<String, Object> user = new LinkedHashMap<>();
    user.put("login", InMemoryTokenStore.MOCK_USER_LOGIN);
    user.put("id", 1);
    user.put("name", "Mock User");
    user.put("email", "mock-user@example.com");
    user.put("avatar_url", "https://example.com/avatar/mock.png");
    return ResponseEntity.ok(user);
  }

  /**
   * IETF health check endpoint per draft-inadarei-api-health-check-06.
   *
   * <p>Always returns {@code pass} with {@code application/health+json} media type.
   *
   * @return {@code 200 OK} with IETF health JSON body
   */
  @GetMapping(value = "/health", produces = "application/health+json")
  public ResponseEntity<Map<String, Object>> health() {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("status", "pass");
    response.put("description", "Mock OAuth service is running (test-only)");
    return ResponseEntity.ok(response);
  }
}
