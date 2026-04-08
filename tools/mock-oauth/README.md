# Mock OAuth service

This Spring Boot service is test-only and exists to drive auth contract validation for the Go stack. It is never deployed to production and only needs to run locally or in CI.

## Spring Boot 4 compatibility

- Parent upgraded to Spring Boot 4.0.5 with Java 21. Runtime endpoints are unchanged and the packaged artifact stays at `target/mock-oauth.jar`.
- `spring-boot-starter-test` no longer brings MockMvc auto-configuration. Tests now include `spring-boot-test-autoconfigure` explicitly and build `MockMvc` via `MockMvcBuilders` to keep the smoke suite working.
- Dockerfile, Makefile, and moon tasks still build the same jar and image names; no container contract changes are required.

## Relationship to auth validation

- The Go BFF contract tests (`make -C stacks/go/net-http/rest check-contract-auth`) launch this service on port 9000 and fail fast if it is not healthy.
- Keep mock OAuth behavior stable (redirect, token, userinfo, health) to avoid breaking the auth-profile contract tests.

## How to verify locally

Use Java 21 (set `JAVA_HOME` if needed):

```bash
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 PATH="$JAVA_HOME/bin:$PATH" moon run mock-oauth:check-ci
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 PATH="$JAVA_HOME/bin:$PATH" make -C stacks/go/net-http/rest check-contract-auth
```

## Dependabot PR 120

This branch supersedes Dependabot PR #120 by applying the Spring Boot 4.0.5 upgrade and restoring the MockMvc test surface needed for the auth contract slice. Merge this change or cherry-pick it into that PR to unblock the upgrade.
