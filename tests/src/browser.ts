import { spawn } from "node:child_process";

const BROWSER_RENDER_TIMEOUT_MS = 15_000;

const WINDOWS_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const MACOS_BROWSER_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

const LINUX_BROWSER_PATHS = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "microsoft-edge",
  "msedge",
];

function getBrowserCandidates(): string[] {
  const envCandidates = [
    process.env.IDP_UI_BROWSER_PATH?.trim(),
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim(),
  ].filter((value): value is string => value !== undefined && value.length > 0);

  const platformCandidates =
    process.platform === "win32"
      ? WINDOWS_BROWSER_PATHS
      : process.platform === "darwin"
        ? MACOS_BROWSER_PATHS
        : LINUX_BROWSER_PATHS;

  return [...envCandidates, ...platformCandidates];
}

function runDumpDom(browserPath: string, url: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      browserPath,
      [
        "--headless",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--virtual-time-budget=10000",
        "--dump-dom",
        url.toString(),
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    const timeoutId = setTimeout(() => {
      child.kill();
      reject(new Error(`Browser render timed out after ${BROWSER_RENDER_TIMEOUT_MS}ms`));
    }, BROWSER_RENDER_TIMEOUT_MS);

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    });

    child.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    });

    child.once("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    child.once("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
        reject(new Error(stderr.length > 0 ? stderr : `Browser exited with code ${code ?? -1}`));
        return;
      }

      resolve(Buffer.concat(stdoutChunks).toString("utf-8"));
    });
  });
}

export async function renderDomOrThrow(url: URL): Promise<string> {
  const candidates = getBrowserCandidates();
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return await runDumpDom(candidate, url);
    } catch (error) {
      if (
        error instanceof Error &&
        ((error as NodeJS.ErrnoException).code === "ENOENT" ||
          (error as NodeJS.ErrnoException).code === "EINVAL")
      ) {
        lastError = error;
        continue;
      }

      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  const detail =
    lastError instanceof Error ? ` Last error: ${lastError.message}` : "";

  throw new Error(
    "Unable to render the UI in a headless Chromium browser. " +
      "Set IDP_UI_BROWSER_PATH to a local Chrome or Edge executable if auto-detection fails." +
      detail
  );
}
