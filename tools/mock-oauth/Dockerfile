# syntax=docker/dockerfile:1
# Multi-stage build for the Mock OAuth service.
# This service is for automated contract testing only; never deploy to production.
#
# Build example (from tools/mock-oauth/):
#   docker build -t localhost/stemix-mock-oauth:dev .

ARG JAVA_VERSION=21

# ---------------------------------------------------------------------------
# Stage 1: builder — compile and package with Maven
# ---------------------------------------------------------------------------
FROM eclipse-temurin:${JAVA_VERSION}-jdk-alpine AS builder

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
FROM eclipse-temurin:${JAVA_VERSION}-jre-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/target/mock-oauth.jar ./mock-oauth.jar

# Port is configurable at runtime via -e MOCK_OAUTH_PORT=<port>
ENV MOCK_OAUTH_PORT=9000

EXPOSE 9000

ENTRYPOINT ["java", "-jar", "mock-oauth.jar"]
