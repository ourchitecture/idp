import Clarity from "@microsoft/clarity";

const CLARITY_PROJECT_ID = "w4ma9v920h";

let initialized = false;

export function initClarity(): void {
  if (typeof window !== "undefined" && !initialized) {
    Clarity.init(CLARITY_PROJECT_ID);
    initialized = true;
  }
}
