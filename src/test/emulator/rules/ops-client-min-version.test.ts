import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { bindRulesTestEnv } from "./helpers";

describe("firestore.rules — ops/clientMinVersion", () => {
  const rules = bindRulesTestEnv();

  it("allows signed-in get; admin write; denies other writes", async () => {
    await rules.testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("ops").doc("clientMinVersion").set({
        minVersion: "0.11.0",
        updatedAt: "2026-08-15T00:00:00.000Z",
      });
    });

    const player = rules.testEnv.authenticatedContext("player-1");
    await assertSucceeds(
      player.firestore().collection("ops").doc("clientMinVersion").get(),
    );
    await assertFails(
      player
        .firestore()
        .collection("ops")
        .doc("clientMinVersion")
        .set({ minVersion: "9.9.9" }),
    );

    const admin = rules.testEnv.authenticatedContext("admin-1", {
      email: "gelbharttomer@gmail.com",
      email_verified: true,
    });
    await assertSucceeds(
      admin
        .firestore()
        .collection("ops")
        .doc("clientMinVersion")
        .set({
          minVersion: "0.11.0",
          updatedAt: "2026-08-15T12:00:00.000Z",
        }),
    );

    const unauth = rules.testEnv.unauthenticatedContext();
    await assertFails(
      unauth.firestore().collection("ops").doc("clientMinVersion").get(),
    );
  });

  it("allows admin create/update/delete; denies player and unauth writes", async () => {
    const admin = rules.testEnv.authenticatedContext("admin-1", {
      email: "gelbharttomer@gmail.com",
      email_verified: true,
    });
    const player = rules.testEnv.authenticatedContext("player-1");
    const unauth = rules.testEnv.unauthenticatedContext();
    const payload = {
      minVersion: "0.11.0",
      updatedAt: "2026-08-15T12:00:00.000Z",
    };

    await assertSucceeds(
      admin.firestore().collection("ops").doc("clientMinVersion").set(payload),
    );
    await assertSucceeds(
      admin.firestore().collection("ops").doc("clientMinVersion").set({
        ...payload,
        minVersion: "0.12.0",
      }),
    );
    await assertFails(
      player.firestore().collection("ops").doc("clientMinVersion").set(payload),
    );
    await assertFails(
      unauth.firestore().collection("ops").doc("clientMinVersion").set(payload),
    );
    await assertFails(
      player.firestore().collection("ops").doc("clientMinVersion").delete(),
    );
    await assertSucceeds(
      admin.firestore().collection("ops").doc("clientMinVersion").delete(),
    );
    await assertFails(
      unauth.firestore().collection("ops").doc("clientMinVersion").delete(),
    );
  });
});
