# syntax=docker/dockerfile:1
# Multi-stage build for the Mock OAuth service.
# This service is for automated contract testing only; never deploy to production.
#
# Build example (from tools/mock-oauth/):
#   docker build -t localhost/stemix-mock-oauth:dev .

# ---------------------------------------------------------------------------
# Stage 1: builder — compile and package with Maven
# ---------------------------------------------------------------------------
# eclipse-temurin:21-jdk-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM eclipse-temurin:21-jdk-alpine@sha256:c98f0d2e171c898bf896dc4166815d28a56d428e218190a1f35cdc7d82efd61f AS builder

WORKDIR /app

# Copy Maven wrapper and POM first for layer caching
COPY .mvn/ ./.mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:resolve -q -B

COPY src/ ./src/
RUN ./mvnw package -q -DskipTests

# ---------------------------------------------------------------------------
# Stage 2: runtime — lean JRE image with the packaged jar only
# ---------------------------------------------------------------------------
# eclipse-temurin:21-jre-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM eclipse-temurin:21-jre-alpine@sha256:6ad8ed080d9be96b61438ec3ce99388e294af216ed57356000c06070e85c5d5d AS runtime

WORKDIR /app

COPY --from=builder /app/target/mock-oauth.jar ./mock-oauth.jar

# Port is configurable at runtime via -e OUR_IDP_OAUTH_MOCK_PORT=<port>
ENV OUR_IDP_OAUTH_MOCK_PORT=9000

EXPOSE 9000

# Security Scan stage
# ghcr.io/aquasecurity/trivy:0.56.2 — digest pinned 2026-04-09 (ADR-0008)
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:26245f364b6f5d223003dc344ec1eb5eb8439052bfecb31d79aeba0c74344b3a AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
ENTRYPOINT ["java", "-jar", "mock-oauth.jar"]
