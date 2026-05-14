import puppeteer, {
  type Browser,
  type ConsoleMessage,
  type HTTPResponse,
} from "puppeteer";

const BROWSER_RENDER_TIMEOUT_MS = 15_000;
const BROWSER_RENDER_RETRY_MS = 500;

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

function resolveExecutablePath(): string | undefined {
  const explicitPath =
    process.env.OUR_IDP_UI_BROWSER_PATH?.trim() ??
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim();

  return explicitPath !== undefined && explicitPath.length > 0
    ? explicitPath
    : undefined;
}

export async function renderDomOrThrow(
  url: URL,
  expectedText: readonly string[] = []
): Promise<string> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      executablePath: resolveExecutablePath(),
      headless: true,
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
  } catch (error) {
    const detail = error instanceof Error ? ` Last error: ${error.message}` : "";

    throw new Error(
      "Unable to render the UI in a headless Chromium browser. " +
        "Puppeteer should install Chrome for Testing during npm install; " +
        "set OUR_IDP_UI_BROWSER_PATH or PUPPETEER_EXECUTABLE_PATH only to override it." +
        detail
    );
  } finally {
    await browser?.close();
  }
}
