import { createHash, timingSafeEqual } from "node:crypto";

export const MEMBER_PROOFS_COLLECTION = "memberProofs";

/**
 * Sessions created on or after this instant must show a proof to heal. Older
 * sessions keep the bounded no-proof heal for members who joined before proofs
 * shipped. Null keeps the sunset off; set it once the proof-writing client is
 * live and stale PWAs have updated, then delete the fallback a release or two later.
 */
export const HEAL_PROOF_REQUIRED_SINCE = null;

const PROOF_HASH_PATTERN = /^[0-9a-f]{64}$/;

/** Lowercase hex SHA-256 of the secret's UTF-8 bytes. Client twin: src/domain/session/join/healSecret.ts. */
export function hashHealSecret(secret) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function sanitizeProofHash(candidate) {
  return typeof candidate === "string" && PROOF_HASH_PATTERN.test(candidate)
    ? candidate
    : undefined;
}

export function healSecretMatchesProof(secret, proofHash) {
  if (typeof secret !== "string" || secret.length === 0 || sanitizeProofHash(proofHash) == null) {
    return false;
  }

  return timingSafeEqual(Buffer.from(hashHealSecret(secret), "hex"), Buffer.from(proofHash, "hex"));
}

export function sessionRequiresHealProof(sessionData, requiredSince = HEAL_PROOF_REQUIRED_SINCE) {
  return (
    typeof requiredSince === "string" &&
    typeof sessionData?.createdAt === "string" &&
    sessionData.createdAt >= requiredSince
  );
}

export function memberProofRef(sessionRef, uid) {
  return sessionRef.collection(MEMBER_PROOFS_COLLECTION).doc(uid);
}
