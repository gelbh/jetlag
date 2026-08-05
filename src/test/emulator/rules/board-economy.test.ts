import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import {
  bindRulesTestEnv,
  adminContext,
  sessionPayload,
} from "./helpers";

describe("firestore.rules — boardEconomyEnabled ops gate", () => {
  const rules = bindRulesTestEnv();

  it("rejects non-ops host enabling boardEconomyEnabled", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-be-1")
      .set(sessionPayload("host-1"));

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-be-1")
        .update({ boardEconomyEnabled: true }),
    );
  });

  it("allows ops admin member to enable boardEconomyEnabled before timer", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-be-2")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "admin-1"],
          memberRoles: { "host-1": "seeker", "admin-1": "observer" },
        }),
      );

    const admin = adminContext(rules.testEnv);
    await assertSucceeds(
      admin
        .firestore()
        .collection("sessions")
        .doc("session-be-2")
        .update({ boardEconomyEnabled: true }),
    );
  });

  it("allows ops admin host to enable on large gameArea geometry (budget)", async () => {
    const ring: [number, number][] = [];
    for (let i = 0; i < 80; i += 1) {
      const t = (i / 80) * Math.PI * 2;
      ring.push([-6.26 + Math.cos(t) * 0.2, 53.35 + Math.sin(t) * 0.2]);
    }
    ring.push(ring[0]!);
    const host = rules.testEnv.authenticatedContext("admin-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-be-large")
      .set(
        sessionPayload("admin-1", {
          gameArea: {
            south: 53.1,
            west: -6.5,
            north: 53.6,
            east: -6.0,
            geometryJson: JSON.stringify({
              type: "Polygon",
              coordinates: [ring],
            }),
          },
        }),
      );

    const admin = adminContext(rules.testEnv);
    await assertSucceeds(
      admin
        .firestore()
        .collection("sessions")
        .doc("session-be-large")
        .update({ boardEconomyEnabled: true }),
    );
  });

  it("rejects ops admin when timerRunningSince is set even if accumulated is 0", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-be-timer")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "admin-1"],
          memberRoles: { "host-1": "seeker", "admin-1": "observer" },
          timerAccumulatedMs: 0,
          timerRunningSince: "2026-01-01T00:00:00.000Z",
        }),
      );

    const admin = adminContext(rules.testEnv);
    await assertFails(
      admin
        .firestore()
        .collection("sessions")
        .doc("session-be-timer")
        .update({ boardEconomyEnabled: true }),
    );
  });

  it("denies boardEconomy state writes when flag is false", async () => {
    const host = rules.testEnv.authenticatedContext("host-1", {
      // hider host
    });
    await host
      .firestore()
      .collection("sessions")
      .doc("session-be-3")
      .set(
        sessionPayload("host-1", {
          memberRoles: { "host-1": "hider" },
          boardEconomyEnabled: false,
        }),
      );

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-be-3")
        .collection("boardEconomy")
        .doc("state")
        .set({
          deck: [],
          hand: [],
          discard: [],
          handLimit: 6,
          activeCurses: [],
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
    );
  });

  it("allows hider boardEconomy state write when flag is true", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-be-4")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "admin-1", "seeker-1"],
          memberRoles: {
            "host-1": "hider",
            "admin-1": "observer",
            "seeker-1": "seeker",
          },
        }),
      );

    const admin = adminContext(rules.testEnv);
    await assertSucceeds(
      admin
        .firestore()
        .collection("sessions")
        .doc("session-be-4")
        .update({ boardEconomyEnabled: true }),
    );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-be-4")
        .collection("boardEconomy")
        .doc("state")
        .set({
          deck: [],
          hand: [],
          discard: [],
          handLimit: 6,
          activeCurses: [],
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-be-4")
        .collection("boardEconomy")
        .doc("state")
        .get(),
    );
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-be-4")
        .collection("boardEconomy")
        .doc("state")
        .set({
          deck: [],
          hand: [],
          discard: [],
          handLimit: 6,
          activeCurses: [],
          updatedAt: "2026-01-01T00:00:01.000Z",
        }),
    );
    const stranger = rules.testEnv.authenticatedContext("stranger-1");
    await assertFails(
      stranger
        .firestore()
        .collection("sessions")
        .doc("session-be-4")
        .collection("boardEconomy")
        .doc("state")
        .get(),
    );
  });
});
