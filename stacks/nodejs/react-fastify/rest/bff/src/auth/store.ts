import { randomBytes } from "node:crypto";

const STATE_MAX_AGE_MS = 15 * 60 * 1000;
const DEFAULT_SESSION_TTL_MINUTES = 60;
const MINUTE_IN_MS = 60_000;

export interface UserInfo {
  login: string;
  id?: number;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export function resolveSessionTTLMinutes(env = process.env): number {
  const raw = env.OUR_IDP_SESSION_TTL_MINUTES?.trim() ?? "";
  if (raw === "") {
    return DEFAULT_SESSION_TTL_MINUTES;
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL_MINUTES;
  }

  return parsed;
}

export class StateStore {
  private readonly data = new Map<string, number>();

  create(): string {
    const value = randomBytes(16).toString("hex");
    this.data.set(value, Date.now());
    return value;
  }

  clear(): void {
    this.data.clear();
  }

  consume(state: string | undefined): boolean {
    if (!state) {
      return false;
    }

    const createdAt = this.data.get(state);
    if (createdAt === undefined) {
      return false;
    }

    this.data.delete(state);

    if (Date.now() - createdAt > STATE_MAX_AGE_MS) {
      return false;
    }

    return true;
  }
}

interface SessionEntry {
  user: UserInfo;
  createdAt: number;
}

export class SessionStore {
  private readonly data = new Map<string, SessionEntry>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(sessionTtlMinutes = DEFAULT_SESSION_TTL_MINUTES, now: () => number = Date.now) {
    this.ttlMs = sessionTtlMinutes * MINUTE_IN_MS;
    this.now = now;
    const cleanupIntervalMs = Math.min(this.ttlMs, MINUTE_IN_MS);
    this.startCleanup(cleanupIntervalMs);
  }

  private startCleanup(intervalMs: number): void {
    if (intervalMs <= 0) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.removeExpired();
    }, intervalMs);

    if (typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  private isExpired(entry: SessionEntry, now = this.now()): boolean {
    return now - entry.createdAt > this.ttlMs;
  }

  private removeExpired(): void {
    const now = this.now();
    for (const [id, entry] of this.data.entries()) {
      if (this.isExpired(entry, now)) {
        this.data.delete(id);
      }
    }
  }

  stop(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  create(user: UserInfo): string {
    const id = randomBytes(16).toString("hex");
    const now = this.now();
    this.data.set(id, { user, createdAt: now });
    this.removeExpired();
    return id;
  }

  get(sessionId: string | undefined): UserInfo | undefined {
    if (!sessionId) {
      return undefined;
    }

    const entry = this.data.get(sessionId);
    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.data.delete(sessionId);
      return undefined;
    }

    return entry.user;
  }

  delete(sessionId: string | undefined): void {
    if (!sessionId) {
      return;
    }

    this.data.delete(sessionId);
  }

  clear(): void {
    this.data.clear();
  }
}
