#!/usr/bin/env python3
"""run-contract-check.py - Cross-platform contract test runner.

Starts the stack's web and BFF servers, polls until the BFF is ready,
runs the contract test suite, then stops the servers and reports the
result.

Usage (called from a stack Makefile via `make check-contract`):

    WEB_START_CMD="..." \
    BFF_START_CMD="..." \
    WEB_URL=http://127.0.0.1:3300 \
    BFF_URL=http://127.0.0.1:8300 \
    STACK_PATH=stacks/go/net-http/rest \
    ROOT_DIR=../../../.. \
      python3 scripts/ci/run-contract-check.py

Required environment variables:
    STACK_PATH        Relative path to the stack
    WEB_START_CMD     Shell command to start the web server
    BFF_START_CMD     Shell command to start the BFF server
    WEB_URL           Full base URL for the web server
    BFF_URL           Full base URL for the BFF server
    ROOT_DIR          Repo root directory (used for npm --prefix)

Optional environment variables:
    CONTRACT_PROFILES Comma-separated contract profile names
    READY_TIMEOUT     Seconds to wait for readiness (default: 120)
    READY_INTERVAL    Polling interval in seconds (default: 1)
"""

import atexit
import os
import re
import shlex
import signal
import subprocess
import sys
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

STACK_PATH = os.environ.get("STACK_PATH")
WEB_START_CMD = os.environ.get("WEB_START_CMD")
BFF_START_CMD = os.environ.get("BFF_START_CMD")
WEB_URL = os.environ.get("WEB_URL")
BFF_URL = os.environ.get("BFF_URL")
ROOT_DIR = os.environ.get("ROOT_DIR")
CONTRACT_PROFILES = os.environ.get("CONTRACT_PROFILES", "")
READY_TIMEOUT = int(os.environ.get("READY_TIMEOUT", "120"))
READY_INTERVAL = int(os.environ.get("READY_INTERVAL", "1"))

for var in ("STACK_PATH", "WEB_START_CMD", "BFF_START_CMD",
            "WEB_URL", "BFF_URL", "ROOT_DIR"):
    if not os.environ.get(var):
        print(f"[contract:{STACK_PATH or '?'}] ERROR: {var} is required",
              file=sys.stderr)
        sys.exit(1)

READINESS_PATH = "/readiness"
BFF_READY_URL = BFF_URL.rstrip("/") + READINESS_PATH

# ---------------------------------------------------------------------------
# Process management
# ---------------------------------------------------------------------------

_processes: list[tuple[subprocess.Popen, str]] = []

INLINE_ENV_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=.*$")


def _terminate(proc: subprocess.Popen, label: str) -> None:
    """Terminate a process, using platform-appropriate methods."""
    if proc.poll() is not None:
        return
    try:
        if sys.platform == "win32":
            # Kill the full process tree so npm/go child processes do not leak.
            subprocess.call(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=5)
        log(f"{label} stopped (pid {proc.pid})")
    except Exception:
        proc.kill()
        proc.wait(timeout=5)
        log(f"{label} killed (pid {proc.pid})")


def cleanup() -> None:
    """Stop all managed server processes."""
    log_section("Stopping servers")
    for proc, label in reversed(_processes):
        _terminate(proc, label)


atexit.register(cleanup)


def _signal_handler(signum, frame):
    """Handle SIGTERM/SIGINT by triggering atexit cleanup and exiting."""
    sys.exit(128 + signum)


if sys.platform != "win32":
    signal.signal(signal.SIGTERM, _signal_handler)
signal.signal(signal.SIGINT, _signal_handler)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def log(msg: str) -> None:
    print(f"[contract:{STACK_PATH}] {msg}", flush=True)


def log_section(msg: str) -> None:
    print(f"\n[contract:{STACK_PATH}] --- {msg} ---", flush=True)


def parse_start_command(cmd: str) -> tuple[list[str], dict[str, str]]:
    """Parse a start command with optional POSIX-style inline env prefixes."""
    try:
        tokens = shlex.split(cmd, posix=True)
    except ValueError as exc:
        raise ValueError(f"invalid start command {cmd!r}: {exc}") from exc

    if not tokens:
        raise ValueError("start command must not be empty")

    inline_env: dict[str, str] = {}
    index = 0

    while index < len(tokens) and INLINE_ENV_RE.match(tokens[index]):
        name, value = tokens[index].split("=", 1)
        inline_env[name] = value
        index += 1

    if index < len(tokens) and tokens[index] == "env":
        index += 1
        if index < len(tokens) and tokens[index] == "--":
            index += 1
        while index < len(tokens) and INLINE_ENV_RE.match(tokens[index]):
            name, value = tokens[index].split("=", 1)
            inline_env[name] = value
            index += 1

    argv = tokens[index:]
    if not argv:
        raise ValueError(f"start command {cmd!r} did not include an executable")

    return argv, inline_env


def start_server(cmd: str, label: str) -> subprocess.Popen:
    """Start a server process in the background."""
    argv, inline_env = parse_start_command(cmd)
    popen_kwargs = {
        "env": {**os.environ, **inline_env},
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }
    if sys.platform == "win32":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs["start_new_session"] = True

    proc = subprocess.Popen(
        argv,
        **popen_kwargs,
    )
    _processes.append((proc, label))
    log(f"{label} started (pid {proc.pid})")
    return proc


def wait_for_ready(label: str, url: str, timeout: int,
                   interval: int,
                   proc: subprocess.Popen | None = None) -> bool:
    """Poll a URL until it returns HTTP 2xx or the timeout is reached."""
    log(f"Waiting for {label} at {url} (timeout: {timeout}s)")
    elapsed = 0

    while True:
        if proc is not None:
            exit_code = proc.poll()
            if exit_code is not None:
                print(
                    f"[contract:{STACK_PATH}] ERROR: {label} process exited "
                    f"before readiness completed (exit {exit_code})",
                    file=sys.stderr,
                )
                return False

        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                status = resp.status
        except (urllib.error.URLError, urllib.error.HTTPError,
                OSError, ValueError):
            status = 0

        if 200 <= status < 300:
            log(f"{label} is ready (HTTP {status}) after {elapsed}s")
            return True

        if elapsed >= timeout:
            print(
                f"[contract:{STACK_PATH}] TIMEOUT: {label} did not "
                f"become ready within {timeout}s (last HTTP status: "
                f"{status})",
                file=sys.stderr,
            )
            return False

        time.sleep(interval)
        elapsed += interval


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    log_section(f"Starting contract check: {STACK_PATH}")
    log(f"Web URL:  {WEB_URL}")
    log(f"BFF URL:  {BFF_URL}")
    if CONTRACT_PROFILES:
        log(f"Profiles: {CONTRACT_PROFILES}")

    # --- Start servers -------------------------------------------------------

    log_section("Starting servers")
    bff_proc = start_server(BFF_START_CMD, "BFF server")
    start_server(WEB_START_CMD, "Web server")

    # --- Wait for readiness --------------------------------------------------

    log_section("Waiting for readiness")

    if not wait_for_ready("BFF readiness", BFF_READY_URL,
                          READY_TIMEOUT, READY_INTERVAL, bff_proc):
        print(
            f"[contract:{STACK_PATH}] FAIL: BFF did not become ready "
            f"-- aborting test run",
            file=sys.stderr,
        )
        return 1

    # --- Run contract tests --------------------------------------------------

    log_section("Running contract tests")

    test_env = {
        **os.environ,
        "IDP_WEB_URL": WEB_URL,
        "IDP_BFF_URL": BFF_URL,
        "IDP_STACK_PATH": STACK_PATH,
    }
    if CONTRACT_PROFILES:
        test_env["IDP_CONTRACT_PROFILES"] = CONTRACT_PROFILES

    result = subprocess.run(
        ["npm", "--prefix", ROOT_DIR, "run", "test:contract"],
        env=test_env,
    )

    # --- Report --------------------------------------------------------------

    log_section("Result")
    if result.returncode == 0:
        log(f"PASS: all contract tests passed for {STACK_PATH}")
    else:
        print(
            f"[contract:{STACK_PATH}] FAIL: contract tests failed for "
            f"{STACK_PATH} (exit {result.returncode})",
            file=sys.stderr,
        )

    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
