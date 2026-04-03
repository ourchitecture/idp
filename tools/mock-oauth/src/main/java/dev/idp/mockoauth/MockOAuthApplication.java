package dev.idp.mockoauth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Mock OAuth 2.0 service entry point.
 *
 * <p>This service provides deterministic in-memory OAuth 2.0 endpoints for automated
 * contract testing of the Go BFF auth flow. It is <strong>never</strong> deployed to
 * production and must not be used with real credentials or sensitive data.
 *
 * <p>Default port: {@code 9000} (override with {@code MOCK_OAUTH_PORT} env var).
 */
@SpringBootApplication
public class MockOAuthApplication {

  public static void main(String[] args) {
    SpringApplication.run(MockOAuthApplication.class, args);
  }
}
