// GA4 opt-out window flag — must be set before the analytics script fires
const GA_DISABLE_KEY = "ga-disable-G-DF7EEF2WEZ";

export function disableGA(): void {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY] = true;
  }
}
