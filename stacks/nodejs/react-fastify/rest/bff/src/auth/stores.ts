import { randomBytes } from "node:crypto";
import { OAUTH_STATE_MAX_AGE_MS } from "./config";

function generateHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export class StateStore {
  constructor(private readonly maxAgeMs = OAUTH_STATE_MAX_AGE_MS) {}

  private readonly states = new Map<string, number>();

  create(): string {
    const state = generateHex(16);
    this.states.set(state, Date.now());
    return state;
  }

  consume(state: string | undefined): boolean {
    if (state === undefined || state.length === 0) {
      return false;
    }

    const createdAt = this.states.get(state);
    if (createdAt === undefined) {
      return false;
    }

    this.states.delete(state);

    if (Date.now() - createdAt > this.maxAgeMs) {
      return false;
    }

    return true;
  }

  clear(): void {
    this.states.clear();
  }
}

export interface SessionUser {
  login: string;
  id?: number;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export class SessionStore {
  private readonly sessions = new Map<string, SessionUser>();

  create(user: SessionUser): string {
    const id = generateHex(16);
    this.sessions.set(id, user);
    return id;
  }

  get(id: string | undefined): SessionUser | undefined {
    if (id === undefined || id.length === 0) {
      return undefined;
    }
    return this.sessions.get(id);
  }

  delete(id: string | undefined): void {
    if (id === undefined || id.length === 0) {
      return;
    }
    this.sessions.delete(id);
  }

  clear(): void {
    this.sessions.clear();
  }
}
