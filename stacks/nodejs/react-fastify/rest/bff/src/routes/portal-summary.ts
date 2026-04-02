import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";

const SUMMARY_TIMEOUT_MS = 2_000;

const healthEnvelopeSchema = z.object({
  status: z.enum(["pass", "fail", "warn"]),
});

const componentSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.literal("service"),
  status: z.enum(["healthy", "degraded"]),
  latencyMs: z.number().nonnegative(),
  observedAt: z.string(),
});

const summaryResponseSchema = z.object({
  generatedAt: z.string(),
  status: z.enum(["ok", "degraded"]),
  metrics: z.object({
    totalComponents: z.number().int().nonnegative(),
    healthyComponents: z.number().int().nonnegative(),
    degradedComponents: z.number().int().nonnegative(),
  }),
  freshness: z.object({
    maxAgeSeconds: z.number().int().nonnegative(),
  }),
  components: z.array(componentSchema).min(1),
});

type PortalComponent = z.infer<typeof componentSchema>;

function resolveStatusWebUrl(): URL | null {
  const raw = process.env.OUR_IDP_STATUS_WEB_URL?.trim();
  if (raw === undefined || raw.length === 0) {
    return null;
  }

  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

async function observeWebComponent(baseUrl: URL): Promise<PortalComponent> {
  const startedAt = Date.now();
  let status: PortalComponent["status"] = "degraded";

  try {
    const response = await fetch(new URL("/health", baseUrl), {
      headers: {
        Accept: "application/health+json, application/json",
      },
      signal: AbortSignal.timeout(SUMMARY_TIMEOUT_MS),
    });

    if (response.ok) {
      const payload = healthEnvelopeSchema.parse(await response.json());
      if (payload.status === "pass") {
        status = "healthy";
      }
    }
  } catch {
    status = "degraded";
  }

  return {
    id: "idp-web",
    label: "IDP Web",
    kind: "service",
    status,
    latencyMs: Date.now() - startedAt,
    observedAt: new Date().toISOString(),
  };
}

function createBffComponent(): PortalComponent {
  return {
    id: "idp-bff",
    label: "IDP BFF",
    kind: "service",
    status: "healthy",
    latencyMs: 0,
    observedAt: new Date().toISOString(),
  };
}

function buildSummary(components: PortalComponent[]) {
  const generatedAt = new Date();
  const healthyComponents = components.filter((component) => component.status === "healthy").length;
  const degradedComponents = components.length - healthyComponents;

  const maxAgeSeconds = components.reduce((maxAge, component) => {
    const observedAt = Date.parse(component.observedAt);
    if (!Number.isFinite(observedAt)) {
      return maxAge;
    }

    const ageSeconds = Math.max(0, Math.floor((generatedAt.getTime() - observedAt) / 1000));
    return Math.max(maxAge, ageSeconds);
  }, 0);

  return summaryResponseSchema.parse({
    generatedAt: generatedAt.toISOString(),
    status: degradedComponents > 0 ? "degraded" : "ok",
    metrics: {
      totalComponents: components.length,
      healthyComponents,
      degradedComponents,
    },
    freshness: {
      maxAgeSeconds,
    },
    components,
  });
}

export const portalSummaryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/portal/summary", async () => {
    const components: PortalComponent[] = [];
    const webUrl = resolveStatusWebUrl();

    if (webUrl !== null) {
      components.push(await observeWebComponent(webUrl));
    }

    components.push(createBffComponent());

    return buildSummary(components);
  });
};
