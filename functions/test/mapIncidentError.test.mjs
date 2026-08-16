import test from "node:test";
import assert from "node:assert/strict";
import { HttpsError } from "firebase-functions/v2/https";
import { mapIncidentError } from "../handlers/incident/shared.mjs";
import { SUPPORT_AGENT_LLM_FAILED } from "../incident/supportAgentTurn.mjs";

test("mapIncidentError maps LLM failure to expected support-agent unavailable", () => {
  assert.throws(
    () => mapIncidentError(new Error(SUPPORT_AGENT_LLM_FAILED)),
    (error) => {
      assert.ok(error instanceof HttpsError);
      assert.equal(error.code, "internal");
      assert.equal(error.message, "Support agent is temporarily unavailable.");
      return true;
    },
  );
});

test("mapIncidentError rethrows existing HttpsError unchanged", () => {
  const original = new HttpsError("permission-denied", "Nope.");
  assert.throws(
    () => mapIncidentError(original),
    (error) => error === original,
  );
});
