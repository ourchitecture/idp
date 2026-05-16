import { assert } from "../assertions";
import { renderDomOrThrow } from "../browser";
import { request } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

function isUiModeDeclared(context: ContractContext): boolean {
  return context.stackMetadata?.capabilities?.ui?.enabled === true;
}

function resolveUiMode(context: ContractContext): "spa" | "ssr" | "server-rendered" | null {
  if (!isUiModeDeclared(context)) {
    return null;
  }

  return context.stackMetadata?.capabilities?.ui?.mode ?? "spa";
}

export function createUiProfileTests(context: ContractContext): TestCase[] {
  const mode = resolveUiMode(context);
  if (mode === null) {
    return [];
  }

  const { webBaseUrl, bffBaseUrl } = context;

  return [
    {
      name: "ui-profile:web root returns HTML document shell",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        const response = await request(new URL("/", webBaseUrl));

        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(contentType.includes("text/html"), "Web root must return text/html for UI-capable stacks");

        const bodyLower = response.body.toLowerCase();
        assert(bodyLower.includes("<html"), "Web response must include an <html> document shell");
      },
    },
    {
      name: "ui-profile:web document shell includes a title",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        const response = await request(new URL("/", webBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const bodyLower = response.body.toLowerCase();
        assert(bodyLower.includes("<title"), "Web response must include a <title> tag");
      },
    },
    {
      name: "ui-profile:web root renders live portal summary content",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        await ensureServiceAvailable("BFF server", bffBaseUrl);

        const renderedDom = await renderDomOrThrow(new URL("/", webBaseUrl), [
          "System Status",
          "Observed Components",
          "IDP BFF",
        ]);

        assert(
          renderedDom.includes("System Status"),
          "Rendered home page must include the live portal summary status card"
        );
        assert(
          renderedDom.includes("Observed Components"),
          "Rendered home page must include the observed components section"
        );
        assert(
          renderedDom.includes("IDP BFF"),
          "Rendered home page must include a component label from the live portal summary"
        );
      },
    },
    {
      name: "ui-profile:status route renders detailed portal summary content",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        await ensureServiceAvailable("BFF server", bffBaseUrl);

        const renderedDom = await renderDomOrThrow(new URL("/status", webBaseUrl), [
          "Detailed IDP status",
          "Observed Components",
          "Publication Path",
          "IDP BFF",
        ]);

        assert(
          renderedDom.includes("Detailed IDP status"),
          "Rendered status route must include the detailed status heading"
        );
        assert(
          renderedDom.includes("Observed Components"),
          "Rendered status route must include the observed components section"
        );
        assert(
          renderedDom.includes("Publication Path"),
          "Rendered status route must include the static publication guidance section"
        );
        assert(
          renderedDom.includes("IDP BFF"),
          "Rendered status route must include a component label from the live portal summary"
        );
      },
    },
    {
      name: `ui-profile:web mode declaration is valid (${mode})`,
      run: async () => {
        assert(
          mode === "spa" || mode === "ssr" || mode === "server-rendered",
          "UI mode must be one of: spa, ssr, server-rendered"
        );
      },
    },
  ];
}
