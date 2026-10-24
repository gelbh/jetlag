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

const PROXY_MEMBERSHIP_WAIT_MS = 10_000;

let context: PremiumApiContext = EMPTY_CONTEXT;
const contextListeners = new Set<() => void>();

export function setPremiumApiContext(session: SessionRecord | null): void {
  context =
    !session || session.id === LOCAL_SESSION_ID
      ? EMPTY_CONTEXT
      : {
          sessionId: session.id,
          tier: isPremiumSession(session) ? "premium" : "free",
          memberUids: session.memberUids,
        };

  for (const listener of contextListeners) {
    listener();
  }
}

export function getPremiumApiContext(): PremiumApiContext {
  return context;
}

export function shouldUsePremiumProxies(): boolean {
  return context.tier === "premium";
}

let timedOutKey: string | null = null;

/**
 * Resolves once the current uid is a member of the current session, there is no
 * session or uid, or `timeoutMs` passes. Never rejects: the proxy stays the
 * authority. A session + uid pair that already timed out skips the wait so a
 * removed player's queued requests fail fast instead of each waiting again.
 */
export function waitForSessionMembership(
  getUid: () => string | undefined,
  timeoutMs = PROXY_MEMBERSHIP_WAIT_MS,
): Promise<void> {
  const ready = () => {
    const uid = getUid();
    return !context.sessionId || !uid || context.memberUids.includes(uid);
  };
  const key = () => `${context.sessionId}:${getUid()}`;
  const startKey = key();
  if (ready() || startKey === timedOutKey) {
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
    const timer = setTimeout(() => {
      if (key() === startKey) {
        timedOutKey = startKey;
      }
      finish();
    }, timeoutMs);
    contextListeners.add(check);
  });
}
