const DEFAULT_API_PORT = 8000;
const DEFAULT_API_HOST = "127.0.0.1";

function parsePort(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export function resolveBffPort(): number {
  return parsePort(process.env.OUR_IDP_API_PORT) ?? DEFAULT_API_PORT;
}

export function resolveBffHost(): string {
  const overrideHost = process.env.OUR_IDP_API_HOST?.trim();
  if (overrideHost !== undefined && overrideHost.length > 0) {
    return overrideHost;
  }

  return DEFAULT_API_HOST;
}
