import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { bindRulesTestEnv } from "./helpers";

describe("firestore.rules — appConfig", () => {
  const rules = bindRulesTestEnv();

  it("allows signed-in clients to read appConfig but not write it", async () => {
    await rules.testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("appConfig").doc("runtime").set({
        requiredMinAppVersion: "0.9.5.1",
        hotfixGraceSeconds: 30,
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
    });

    const client = rules.testEnv.authenticatedContext("player-1");
    await assertSucceeds(
      client.firestore().collection("appConfig").doc("runtime").get(),
    );
    await assertFails(
      client
        .firestore()
        .collection("appConfig")
        .doc("runtime")
        .set({ requiredMinAppVersion: "9.9.9.9" }),
    );
  });
});
