package dev.idp.mockoauth;

import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * In-memory store for authorization codes.
 *
 * <p>Test-only: responses are deterministic and there is no persistence. A single well-known mock
 * access token is returned by the token endpoint for all requests.
 */
@Component
public class InMemoryTokenStore {

  /** Deterministic access token returned for all token requests. */
  public static final String MOCK_ACCESS_TOKEN = "mock-access-token-test-only";

  /** Login name included in all userinfo responses. */
  public static final String MOCK_USER_LOGIN = "mock-user";

  /**
   * Generates a new authorization code. Codes are single-use by convention but are not persisted
   * or validated; the token endpoint always returns {@link #MOCK_ACCESS_TOKEN} regardless of the
   * supplied code.
   *
   * @return a new authorization code string
   */
  public String generateCode() {
    return "mock-code-" + UUID.randomUUID();
  }
}
