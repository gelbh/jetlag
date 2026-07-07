import {
  isPremiumSession,
  LOCAL_SESSION_ID,
  type SessionRecord,
  type SessionTier,
} from "../../domain/map/annotations";

interface PremiumApiContext {
  sessionId: string | null;
  tier: SessionTier;
}

let context: PremiumApiContext = {
  sessionId: null,
  tier: "free",
};

export function setPremiumApiContext(session: SessionRecord | null): void {
  if (!session || session.id === LOCAL_SESSION_ID) {
    context = { sessionId: null, tier: "free" };
    return;
  }

  context = {
    sessionId: session.id,
    tier: isPremiumSession(session) ? "premium" : "free",
  };
}

export function getPremiumApiContext(): PremiumApiContext {
  return context;
}

export function shouldUsePremiumProxies(): boolean {
  return context.tier === "premium";
}
