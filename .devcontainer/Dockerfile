# syntax=docker/dockerfile:1
# Stemix dev-tools container
# Multi-purpose developer environment with all project tools pre-installed.
#
# Use cases:
# 1. VS Code dev container base
# 2. GitHub Copilot/Codex agent environment base
# 3. CI/CD workflow container for docker run-based task execution
#
# Build context must be the repository root.
#
# Build example (from repo root):
#   docker build -t localhost/ourchitecture/idp/stemix-dev-tools:dev -f .devcontainer/Dockerfile .
#
# Run example:
#   docker run --rm -it localhost/ourchitecture/idp/stemix-dev-tools:dev bash

# Global ARG for Trivy version (used in scanner stage FROM)
ARG TRIVY_VERSION=0.56.2
# ARG for Trivy apt package version (what's available in the apt repository)
ARG TRIVY_APT_VERSION=0.70.0

FROM ubuntu:24.04@sha256:84e77dee7d1bc93fb029a45e3c6cb9d8aa4831ccfcc7103d36e876938d28895b AS base

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system packages and dependencies
RUN apt-get update && apt-get install -y \
    git \
    make \
    curl \
    wget \
    bash \
    jq \
    ca-certificates \
    gnupg \
    unzip \
    zip \
    sudo \
    build-essential \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (client only, no daemon)
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Install Eclipse Temurin JDK 21 (required for tools/mock-oauth)
RUN wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc \
    && echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    && apt-get install -y temurin-21-jdk maven \
    && rm -rf /var/lib/apt/lists/*

# Install Proto at pinned version 0.55.4
ARG PROTO_VERSION=0.55.4
ENV PROTO_HOME=/opt/proto
ENV PATH="${PROTO_HOME}/shims:${PROTO_HOME}/bin:${PATH}"

RUN curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s -- --version ${PROTO_VERSION} --yes \
    && mv "${HOME}/.proto" "${PROTO_HOME}" \
    && chmod -R a+rX "${PROTO_HOME}"

# Copy .prototools to install all pinned tools
WORKDIR /workspace
COPY .prototools ./

# Install all pinned tools via proto
RUN proto install

# Install gitleaks at pinned version (matching scripts/ci/check-privacy.sh)
ARG GITLEAKS_VERSION=v8.30.1
RUN proto run go -- install "github.com/zricethezav/gitleaks/v8@${GITLEAKS_VERSION}"

# Install Trivy CLI at available apt version (for developer use in container)
# Scanner stage uses official container image at pinned version
# Re-declare global ARG to use in this stage
ARG TRIVY_APT_VERSION
RUN wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor -o /usr/share/keyrings/trivy.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | tee /etc/apt/sources.list.d/trivy.list \
    && apt-get update \
    && apt-get install -y trivy=${TRIVY_APT_VERSION} \
    && rm -rf /var/lib/apt/lists/*

# Install semgrep at pinned version (matching scripts/ci/check-privacy.sh)
ARG SEMGREP_VERSION=1.157.0
RUN proto run uv -- tool install --force "semgrep==${SEMGREP_VERSION}"

# Copy package files for npm dependencies
COPY package.json package-lock.json ./

# Install npm dependencies (root workspace dev tools)
RUN npm ci --ignore-scripts

# Create non-root user with passwordless sudo
# Create docker group first (Docker CLI install doesn't create it)
RUN groupadd docker \
    && useradd -m -s /bin/bash -G docker vscode \
    && echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode

# Set proto environment for all users via /etc/profile.d
RUN echo 'export PROTO_HOME=/opt/proto' > /etc/profile.d/proto.sh \
    && echo 'export PATH="${PROTO_HOME}/shims:${PROTO_HOME}/bin:${PATH}"' >> /etc/profile.d/proto.sh \
    && chmod +x /etc/profile.d/proto.sh

# Ensure vscode user can access proto and node_modules
RUN chown -R vscode:vscode "${PROTO_HOME}" /workspace

# Security scan stage
FROM ghcr.io/aquasecurity/trivy:${TRIVY_VERSION}@sha256:9aebdee5e85129a1bdd9977676baa6cf0579195fc4809570cc9dd55f6e92863c AS scanner
COPY --from=base / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

# Final stage
FROM base
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

USER vscode
WORKDIR /workspace

CMD ["/bin/bash"]
