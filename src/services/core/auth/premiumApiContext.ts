import {
  isPremiumSession,
  LOCAL_SESSION_ID,
  type SessionRecord,
  type SessionTier,
} from "@/domain/map/annotations";

interface PremiumApiContext {
  sessionId: string | null;
  tier: SessionTier;
  memberUids: readonly string[];
}

const EMPTY_CONTEXT: PremiumApiContext = { sessionId: null, tier: "free", memberUids: [] };

/** Covers the rejoin heal window (~7 s observed) without hanging map data. */
export const PROXY_MEMBERSHIP_WAIT_MS = 10_000;

let context: PremiumApiContext = EMPTY_CONTEXT;
const contextListeners = new Set<() => void>();

export function setPremiumApiContext(session: SessionRecord | null): void {
  context =
    !session || session.id === LOCAL_SESSION_ID
      ? EMPTY_CONTEXT
      : {
          sessionId: session.id,
          tier: isPremiumSession(session) ? "premium" : "free",
          memberUids: session.memberUids ?? [],
        };

  for (const listener of [...contextListeners]) {
    listener();
  }
}

export function getPremiumApiContext(): PremiumApiContext {
  return context;
}

export function shouldUsePremiumProxies(): boolean {
  return context.tier === "premium";
}

/**
 * Resolves once `uid` is a member of the current session, the session changes,
 * or `timeoutMs` passes. Never rejects: the proxy stays the authority.
 */
export function waitForSessionMembership(uid: string, timeoutMs: number): Promise<void> {
  const sessionId = context.sessionId;
  const ready = () => context.sessionId !== sessionId || context.memberUids.includes(uid);
  if (!sessionId || ready()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      contextListeners.delete(check);
      resolve();
    };
    const check = () => {
      if (ready()) {
        finish();
      }
    };
    const timer = setTimeout(finish, timeoutMs);
    contextListeners.add(check);
  });
}
