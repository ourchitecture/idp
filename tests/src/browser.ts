import { access } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { exec, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer, {
  type Browser,
  type ConsoleMessage,
  type HTTPResponse,
} from "puppeteer-core";

const BROWSER_RENDER_TIMEOUT_MS = 15_000;
const BROWSER_RENDER_RETRY_MS = 500;

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

type BrowserCandidate = {
  label: string;
  executablePath?: string;
  channel?: "chrome" | "msedge";
};

function getBrowserCandidates(): BrowserCandidate[] {
  const envCandidates = [
    process.env.OUR_IDP_UI_BROWSER_PATH?.trim(),
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim(),
  ]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .map((executablePath) => ({
      label: executablePath,
      executablePath,
    }));

  const platformCandidates =
    process.platform === "win32"
      ? WINDOWS_BROWSER_PATHS
      : process.platform === "darwin"
        ? MACOS_BROWSER_PATHS
        : LINUX_BROWSER_PATHS;

  const channelCandidates: BrowserCandidate[] = [
    { label: "Chrome stable channel", channel: "chrome" },
    { label: "Microsoft Edge stable channel", channel: "msedge" },
  ];

  const pathCandidates = platformCandidates.map((executablePath) => ({
    label: executablePath,
    executablePath,
  }));

  return [...envCandidates, ...channelCandidates, ...pathCandidates];
}

async function canAccessBrowser(candidate: BrowserCandidate): Promise<boolean> {
  if (candidate.executablePath === undefined) {
    return true;
  }

  if (process.platform !== "win32" && !candidate.executablePath.includes("/")) {
    return true;
  }

  try {
    await access(candidate.executablePath);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function findMissingText(dom: string, expectedText: readonly string[]): string[] {
  return expectedText.filter((text) => !dom.includes(text));
}

function summarizeDom(dom: string): string {
  return dom.replace(/\s+/g, " ").trim().slice(0, 500);
}

function summarizeConsole(messages: ConsoleMessage[]): string {
  return messages
    .filter((message) => message.type() === "error" || message.type() === "warning")
    .slice(-5)
    .map((message) => `${message.type()}: ${message.text()}`)
    .join(" | ");
}

function runDumpDom(browserPath: string, url: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--virtual-time-budget=10000",
      "--dump-dom",
      url.toString(),
    ];

    if (process.platform === "win32") {
      const command = `"${browserPath}" ${args.map((arg) => `"${arg}"`).join(" ")}`;
      exec(command, { timeout: BROWSER_RENDER_TIMEOUT_MS }, (error, stdout, stderr) => {
        if (error !== null) {
          reject(new Error(stderr.trim().length > 0 ? stderr.trim() : error.message));
          return;
        }

        resolve(stdout);
      });
      return;
    }

    const child = spawn(browserPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

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

async function renderWithDumpDom(
  browserPath: string,
  url: URL,
  expectedText: readonly string[]
): Promise<string> {
  const deadline = Date.now() + BROWSER_RENDER_TIMEOUT_MS;
  let dom = "";
  let missingText = expectedText;

  while (Date.now() <= deadline) {
    dom = await runDumpDom(browserPath, url);
    missingText = findMissingText(dom, expectedText);

    if (missingText.length === 0) {
      return dom;
    }

    await sleep(BROWSER_RENDER_RETRY_MS);
  }

  throw new Error(
    `Rendered DOM did not include expected text: ${missingText.join(", ")}. ` +
      `DOM excerpt: ${summarizeDom(dom)}`
  );
}

async function renderWithPuppeteer(
  candidate: BrowserCandidate,
  url: URL,
  expectedText: readonly string[]
): Promise<string> {
  const userDataDir = await mkdtemp(join(tmpdir(), "idp-ui-profile-"));
  let browser: Browser | null = null;

  try {
    const browserLocation:
      | { executablePath: string }
      | { channel: "chrome" | "msedge" } =
      candidate.executablePath !== undefined
        ? { executablePath: candidate.executablePath }
        : { channel: candidate.channel ?? "chrome" };

    browser = await puppeteer.launch({
      ...browserLocation,
      headless: true,
      pipe: true,
      userDataDir,
      args: [
        "--disable-background-networking",
        "--disable-gpu",
        "--disable-extensions",
        "--no-first-run",
        "--no-default-browser-check",
      ],
    });

    const page = await browser.newPage();
    const consoleMessages: ConsoleMessage[] = [];
    let pageError: Error | null = null;

    page.on("console", (message) => {
      consoleMessages.push(message);
    });
    page.on("pageerror", (error) => {
      pageError = error;
    });

    const response: HTTPResponse | null = await page.goto(url.toString(), {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_RENDER_TIMEOUT_MS,
    });

    if (response !== null && !response.ok()) {
      throw new Error(`Page returned HTTP ${response.status()} for ${url.toString()}`);
    }

    const deadline = Date.now() + BROWSER_RENDER_TIMEOUT_MS;
    let dom = await page.content();
    let missingText = findMissingText(dom, expectedText);

    while (missingText.length > 0 && Date.now() <= deadline) {
      if (pageError !== null) {
        throw pageError;
      }

      await sleep(BROWSER_RENDER_RETRY_MS);
      dom = await page.content();
      missingText = findMissingText(dom, expectedText);
    }

    if (missingText.length > 0) {
      const consoleDetail = summarizeConsole(consoleMessages);
      throw new Error(
        `Rendered DOM did not include expected text: ${missingText.join(", ")}. ` +
          `DOM excerpt: ${summarizeDom(dom)}` +
          (consoleDetail.length > 0 ? ` Console: ${consoleDetail}` : "")
      );
    }

    return dom;
  } finally {
    await browser?.close();
    await rm(userDataDir, { force: true, recursive: true });
  }
}

export async function renderDomOrThrow(
  url: URL,
  expectedText: readonly string[] = []
): Promise<string> {
  const candidates = getBrowserCandidates();
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    if (!(await canAccessBrowser(candidate))) {
      continue;
    }

    try {
      return await renderWithPuppeteer(candidate, url, expectedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = new Error(`${candidate.label}: ${message}`);

      if (candidate.executablePath !== undefined) {
        try {
          return await renderWithDumpDom(candidate.executablePath, url, expectedText);
        } catch (fallbackError) {
          const fallbackMessage =
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          lastError = new Error(`${candidate.label}: ${message}; dump-dom fallback: ${fallbackMessage}`);
        }
      }
    }
  }

  const detail =
    lastError instanceof Error ? ` Last error: ${lastError.message}` : "";

  throw new Error(
    "Unable to render the UI in a headless Chromium browser. " +
      "Set OUR_IDP_UI_BROWSER_PATH to a local Chrome or Edge executable if auto-detection fails." +
      detail
  );
}
