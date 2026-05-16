#!/usr/bin/env bash
set -euo pipefail

# Check onboarding steps - validates quickstart instructions for new users and contributors
# This script executes the documented quickstart and contributor onboarding steps

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "==> Validating onboarding steps for: $1"
echo "Repository root: $REPO_ROOT"

USER_TYPE="${1:-user}"

cd "$REPO_ROOT"

# Step 1: pnpm install (required for all users)
echo ""
echo "==> Step 1: Installing Node.js dependencies (pnpm install)"
if ! pnpm install; then
  echo "ERROR: pnpm install failed"
  exit 1
fi
echo "SUCCESS: pnpm install completed"

# Step 2: proto install (optional but recommended)
echo ""
echo "==> Step 2: Installing proto toolchain (proto install)"
if command -v proto &> /dev/null; then
  if ! proto install; then
    echo "ERROR: proto install failed"
    exit 1
  fi
  echo "SUCCESS: proto install completed"
else
  echo "WARNING: proto not found in PATH, skipping proto install (optional step)"
fi

if [ "$USER_TYPE" = "contributor" ]; then
  # Contributor-specific validation steps

  # Step 3: Run markdown linting
  echo ""
  echo "==> Step 3 (Contributor): Running markdown linting"
  if ! make check-lint-md; then
    echo "ERROR: Markdown linting failed"
    exit 1
  fi
  echo "SUCCESS: Markdown linting passed"

  # Step 4: Run workflow linting
  echo ""
  echo "==> Step 4 (Contributor): Running workflow linting"
  if ! make check-lint-workflows; then
    echo "ERROR: Workflow linting failed"
    exit 1
  fi
  echo "SUCCESS: Workflow linting passed"

  # Step 5: Verify build capability (dry-run for speed)
  echo ""
  echo "==> Step 5 (Contributor): Verifying build capability"
  # For Go stack - verify build without running
  if ! make -C stacks/go/net-http/rest build; then
    echo "ERROR: Go stack build verification failed"
    exit 1
  fi
  echo "SUCCESS: Go stack builds successfully"

  # For Node.js stack - verify build without running
  if ! make -C stacks/nodejs/react-fastify/rest build; then
    echo "ERROR: Node.js stack build verification failed"
    exit 1
  fi
  echo "SUCCESS: Node.js stack builds successfully"

  echo ""
  echo "==> All contributor onboarding steps validated successfully"
else
  # User-specific validation steps

  # Step 3: Verify stack can start (quick validation)
  echo ""
  echo "==> Step 3 (User): Verifying stack artifacts are buildable"
  # Just verify the build step works, don't actually start servers
  if ! make -C stacks/go/net-http/rest build; then
    echo "ERROR: Default stack build failed"
    exit 1
  fi
  echo "SUCCESS: Default stack builds successfully"

  echo ""
  echo "==> All user onboarding steps validated successfully"
fi

echo ""
echo "==> ✓ Onboarding validation complete for: $USER_TYPE"
