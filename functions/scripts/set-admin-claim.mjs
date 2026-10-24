#!/usr/bin/env node
/**
 * Grant or revoke Firebase Auth custom claim `admin: true`.
 *
 * Emails / UIDs come from env only (Doppler). Never commit personal addresses.
 *
 *   cd functions && doppler run --config prd -- node scripts/set-admin-claim.mjs
 *   ADMIN_CLAIM_EMAILS=a@x.com,b@y.com doppler run -- node functions/scripts/set-admin-claim.mjs
 *   ADMIN_CLAIM_UIDS=uid1,uid2 node functions/scripts/set-admin-claim.mjs --revoke
 *
 * Run with cwd `functions/` (or NODE_PATH) so `firebase-admin` resolves.
 * Requires Application Default Credentials with Auth Admin (e.g. GCP_* via Doppler).
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const revoke = process.argv.includes("--revoke");

function splitCsv(value) {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

const emails = splitCsv(process.env.ADMIN_CLAIM_EMAILS);
const uids = splitCsv(process.env.ADMIN_CLAIM_UIDS);

if (emails.length === 0 && uids.length === 0) {
  console.error(
    "Set ADMIN_CLAIM_EMAILS and/or ADMIN_CLAIM_UIDS (comma-separated). Do not pass emails on the CLI.",
  );
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault() });
}

const auth = getAuth();

async function resolveUid(email) {
  const user = await auth.getUserByEmail(email);
  return user.uid;
}

const targets = new Set(uids);
for (const email of emails) {
  targets.add(await resolveUid(email));
}

for (const uid of targets) {
  const user = await auth.getUser(uid);
  const nextClaims = { ...(user.customClaims ?? {}) };
  if (revoke) {
    delete nextClaims.admin;
  } else {
    nextClaims.admin = true;
  }
  await auth.setCustomUserClaims(uid, nextClaims);
}

console.log(
  `${revoke ? "Revoked" : "Granted"} admin claim for ${targets.size} user(s). Clients must refresh ID tokens (sign out/in or getIdToken(true)).`,
);
