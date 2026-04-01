import { assert } from "../assertions";
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

  const { webBaseUrl } = context;

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
