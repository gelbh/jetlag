import { doc, getDoc, setDoc } from "firebase/firestore";
import { generateHealSecret, hashHealSecret } from "@/domain/session/join/healSecret";
import { getFirestoreDb } from "@/services/core/firebase/firebase";
import { useSessionStore } from "@/state/sessionStore";

export function memberProofDoc(sessionId: string, uid: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "memberProofs", uid);
}

async function createMissingMemberProof(sessionId: string, uid: string): Promise<void> {
  const ref = memberProofDoc(sessionId, uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return;
  }

  const storedSecret = useSessionStore.getState().healSecrets[sessionId];
  const secret = storedSecret ?? generateHealSecret();
  const hash = await hashHealSecret(secret);
  if (!storedSecret) {
    // Store first: a queued setDoc can land after a reload, and a proof no stored secret matches
    // can never be replaced, while a secret without a proof is repaired on the next resume.
    useSessionStore.getState().setHealSecret(sessionId, secret);
  }
  await setDoc(ref, { hash, createdAt: new Date().toISOString() });
}

const confirmed = new Set<string>();
const inflight = new Map<string, Promise<void>>();

/**
 * Best-effort: give this member a heal proof when it has none. Rules forbid
 * overwriting a proof, so an existing one is left alone. Never rejects; a
 * failed attempt is retried on the next resume.
 */
export function ensureMemberProof(sessionId: string, uid: string): Promise<void> {
  // Hashing needs crypto.subtle (secure origins only); skip the read that could never lead to a write.
  if (!globalThis.crypto?.subtle) {
    return Promise.resolve();
  }

  const key = `${sessionId}:${uid}`;
  if (confirmed.has(key)) {
    return Promise.resolve();
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  const promise = createMissingMemberProof(sessionId, uid)
    .then(() => {
      confirmed.add(key);
    })
    .catch(() => undefined)
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/** @internal Test-only reset for the memo. */
export function resetMemberProofCacheForTests(): void {
  confirmed.clear();
  inflight.clear();
}
