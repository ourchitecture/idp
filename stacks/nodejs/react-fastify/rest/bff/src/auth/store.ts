import { randomBytes } from "node:crypto";

const STATE_MAX_AGE_MS = 15 * 60 * 1000;

export interface UserInfo {
  login: string;
  id?: number;
  name?: string;
  email?: string;
  avatar_url?: string;
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

export class SessionStore {
  private readonly data = new Map<string, UserInfo>();

  create(user: UserInfo): string {
    const id = randomBytes(16).toString("hex");
    this.data.set(id, user);
    return id;
  }

  get(sessionId: string | undefined): UserInfo | undefined {
    if (!sessionId) {
      return undefined;
    }

    return this.data.get(sessionId);
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
