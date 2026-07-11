import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import type { GameArea, SessionRecord, SessionTier } from "../../domain/map/annotations";
import type { GameSize } from "../../domain/session/gameSize";
import type { SessionRulesPatch } from "../../domain/session/advancedSessionSettings";
import type { PlayerRole } from "../../domain/session/playerRole";
import type {
  PremiumEntitlements,
  PremiumProductKey,
} from "../../domain/billing/premiumProducts";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";
import { deserializeSessionFromFirestore, serializeGameAreaForFirestore } from "../firestore/firestoreSerialization";

function billingUnavailable(): never {
  throw new Error("Premium billing is not available offline.");
}

function mapCallableError(error: unknown, fallback: string): Error {
  if (error instanceof FirebaseError) {
    return new Error(error.message || fallback, { cause: error });
  }

  return error instanceof Error ? error : new Error(fallback);
}

export async function fetchPremiumEntitlements(): Promise<PremiumEntitlements | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const functions = getFirebaseFunctions();
  const callable = httpsCallable<void, PremiumEntitlements>(
    functions,
    "getPremiumEntitlements",
  );

  try {
    const result = await callable();
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not load premium status.");
  }
}

export async function startPremiumCheckout(
  productKey: PremiumProductKey,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    billingUnavailable();
  }

  const functions = getFirebaseFunctions();
  const callable = httpsCallable<
    { productKey: PremiumProductKey },
    { url: string }
  >(functions, "createCheckoutSession");

  try {
    const result = await callable({
      productKey,
    });
    if (!result.data.url) {
      throw new Error("Checkout URL missing.");
    }
    return result.data.url;
  } catch (error) {
    throw mapCallableError(error, "Could not start checkout.");
  }
}

export async function startPremiumTrial(): Promise<PremiumEntitlements> {
  if (!isFirebaseConfigured()) {
    billingUnavailable();
  }

  const functions = getFirebaseFunctions();
  const callable = httpsCallable<void, PremiumEntitlements>(
    functions,
    "startPremiumTrial",
  );

  try {
    const result = await callable();
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not start free trial.");
  }
}

export async function openPremiumBillingPortal(): Promise<string> {
  if (!isFirebaseConfigured()) {
    billingUnavailable();
  }

  const functions = getFirebaseFunctions();
  const callable = httpsCallable<void, { url: string }>(
    functions,
    "createBillingPortalSession",
  );

  try {
    const result = await callable();
    if (!result.data.url) {
      throw new Error("Billing portal URL missing.");
    }
    return result.data.url;
  } catch (error) {
    throw mapCallableError(error, "Could not open billing portal.");
  }
}

export interface CreatePremiumSessionInput {
  gameArea: GameArea;
  hostUid: string;
  tier: SessionTier;
  transitMetroId?: string;
  hostRole: PlayerRole;
  gameSize: GameSize;
  rulesPatch: SessionRulesPatch;
  distanceUnit: SessionRecord["distanceUnit"];
  hostAppVersion: string;
}

export async function recoverPremiumEntitlements(): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return false;
  }

  const functions = getFirebaseFunctions();
  const callable = httpsCallable<void, { recovered: boolean }>(
    functions,
    "recoverPremiumByStripeEmail",
  );

  try {
    const result = await callable();
    return result.data.recovered === true;
  } catch (error) {
    throw mapCallableError(error, "Could not recover premium purchases.");
  }
}

export async function createPremiumRemoteSession(
  input: CreatePremiumSessionInput,
): Promise<SessionRecord> {
  if (!isFirebaseConfigured()) {
    billingUnavailable();
  }

  const serializedArea = serializeGameAreaForFirestore(input.gameArea);
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<
    {
      gameArea: typeof serializedArea;
      transitMetroId?: string;
      hostRole: PlayerRole;
      gameSize: GameSize;
      distanceUnit: SessionRecord["distanceUnit"];
      hostAppVersion: string;
      rulesPatch: SessionRulesPatch;
    },
    { session: Record<string, unknown> & { id: string } }
  >(functions, "createPremiumSession");

  try {
    const result = await callable({
      gameArea: serializedArea,
      transitMetroId: input.transitMetroId,
      hostRole: input.hostRole,
      gameSize: input.gameSize,
      distanceUnit: input.distanceUnit ?? "imperial",
      hostAppVersion: input.hostAppVersion,
      rulesPatch: input.rulesPatch,
    });

    const raw = result.data.session;
    return deserializeSessionFromFirestore(raw.id, raw);
  } catch (error) {
    throw mapCallableError(error, "Could not create premium session.");
  }
}
