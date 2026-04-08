package dev.idp.mockoauth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Smoke tests for the mock OAuth service endpoints.
 *
 * <p>Validates that all required endpoints respond with the expected deterministic payloads.
 */
@SpringBootTest
class MockOAuthApplicationTests {

  @Autowired
  private WebApplicationContext context;

  private MockMvc mockMvc;

  @BeforeEach
  void setUpMockMvc() {
    mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
  }

  @Test
  void healthEndpointReturnsPass() throws Exception {
    mockMvc
        .perform(get("/health"))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", containsString("application/health+json")))
        .andExpect(jsonPath("$.status").value("pass"));
  }

  @Test
  void authorizeEndpointRedirectsWithCode() throws Exception {
    mockMvc
        .perform(
            get("/oauth/authorize")
                .param("redirect_uri", "http://localhost:8080/callback")
                .param("state", "test-state-123")
                .param("client_id", "mock-client")
                .param("response_type", "code"))
        .andExpect(status().isFound())
        .andExpect(header().string("Location", startsWith("http://localhost:8080/callback")))
        .andExpect(header().string("Location", containsString("code=mock-code-")))
        .andExpect(header().string("Location", containsString("state=test-state-123")));
  }

  @Test
  void authorizeEndpointReturnsBadRequestWhenRedirectUriMissing() throws Exception {
    mockMvc.perform(get("/oauth/authorize")).andExpect(status().isBadRequest());
  }

  @Test
  void tokenEndpointReturnsMockAccessToken() throws Exception {
    mockMvc
        .perform(
            post("/oauth/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("grant_type", "authorization_code")
                .param("code", "any-code")
                .param("client_id", "mock-client")
                .param("redirect_uri", "http://localhost:8080/callback"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.access_token").value("mock-access-token-test-only"))
        .andExpect(jsonPath("$.token_type").value("bearer"));
  }

  @Test
  void userinfoEndpointReturnsMockUser() throws Exception {
    mockMvc
        .perform(get("/userinfo"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.login").value("mock-user"))
        .andExpect(jsonPath("$.email").value("mock-user@example.com"));
  }
}
