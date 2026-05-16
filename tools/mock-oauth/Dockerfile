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
FROM eclipse-temurin:${JAVA_VERSION}-jdk-alpine@sha256:fd10ef3691adde33aa57cd1070eedd4ecbe7eff025e0bc82503fdd15e0e70f47 AS builder

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
FROM eclipse-temurin:${JAVA_VERSION}-jre-alpine@sha256:693c22ea458d62395bac47a2da405d0d18c77b205211ceec4846a550a37684b6 AS runtime

WORKDIR /app

COPY --from=builder /app/target/mock-oauth.jar ./mock-oauth.jar

# Port is configurable at runtime via -e OUR_IDP_OAUTH_MOCK_PORT=<port>
ENV OUR_IDP_OAUTH_MOCK_PORT=9000

EXPOSE 9000

# Security Scan stage
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:9aebdee5e85129a1bdd9977676baa6cf0579195fc4809570cc9dd55f6e92863c AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=dev
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/ourchitecture/idp"
LABEL org.opencontainers.image.url="https://github.com/ourchitecture/idp"
LABEL org.opencontainers.image.vendor="Ourchitecture"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.created-by="moon"
ENTRYPOINT ["java", "-jar", "mock-oauth.jar"]
