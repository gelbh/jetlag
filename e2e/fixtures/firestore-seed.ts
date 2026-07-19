import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { normalizeUsername } from "../../src/domain/game/playerProfile";

const PROJECT_ID = "demo-jetlag";

let testEnvPromise: Promise<RulesTestEnvironment> | null = null;

function firestoreEmulatorTarget(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8180";
  const [host, portText] = raw.split(":");
  const port = Number(portText);
  if (!host || !Number.isFinite(port)) {
    throw new Error(`Invalid FIRESTORE_EMULATOR_HOST: ${raw}`);
  }
  return { host, port };
}

async function getRulesTestEnvironment(): Promise<RulesTestEnvironment> {
  if (!testEnvPromise) {
    const { host, port } = firestoreEmulatorTarget();
    testEnvPromise = initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host, port },
    });
  }
  return testEnvPromise;
}

/** Seeds claim-shaped username docs with rules disabled (client writes are Functions-only). */
export async function seedUsernameProfileDocs(
  uid: string,
  username: string,
): Promise<void> {
  const trimmed = username.trim();
  const normalized = normalizeUsername(trimmed);
  const env = await getRulesTestEnvironment();

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection("usernames").doc(normalized).set({
      uid,
      username: trimmed,
      claimedAt: new Date().toISOString(),
    });
    await db
      .collection("users")
      .doc(uid)
      .collection("profile")
      .doc("main")
      .set(
        {
          username: trimmed,
          usernameNormalized: normalized,
          displayName: trimmed,
          leaderboardOptIn: false,
        },
        { merge: true },
      );
  });
}
