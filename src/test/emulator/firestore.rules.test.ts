import { deleteField } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { milesToMeters } from "../../domain/map/distance";
import { serializeGameAreaForFirestore } from "../../services/firestore/firestoreSerialization";
import { DUBLIN_CITY_GAME_AREA } from "../fixtures/dublinGameArea";

const PROJECT_ID = "demo-jetlag-rules";
const ADMIN_EMAIL = "gelbharttomer@gmail.com";

function adminContext(testEnv: RulesTestEnvironment, uid = "admin-1") {
  return testEnv.authenticatedContext(uid, {
    email: ADMIN_EMAIL,
    email_verified: true,
  });
}

function sessionPayload(hostUid: string, overrides: Record<string, unknown> = {}) {
  return {
    code: "ABCD",
    gameArea: serializeGameAreaForFirestore(DUBLIN_CITY_GAME_AREA),
    hostUid,
    createdAt: "2026-01-01T00:00:00.000Z",
    memberUids: [hostUid],
    memberRoles: { [hostUid]: "seeker" },
    gameSize: "medium",
    hidingZoneRadiusMeters: milesToMeters(0.25),
    tier: "free",
    status: "active",
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    ...overrides,
  };
}

function annotationPayload() {
  return {
    type: "pin",
    geometryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.35] },
    }),
    metadata: { createdAt: "2026-01-01T00:00:00.000Z", label: "Test" },
    status: "active",
  };
}

function hidingZonePayload() {
  return {
    stationId: "station-1",
    stationName: "Test Station",
    center: { lat: 53.35, lng: -6.26 },
    radiusMeters: milesToMeters(0.25),
    geometryJson: JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [-6.26, 53.35],
          [-6.25, 53.35],
          [-6.25, 53.36],
          [-6.26, 53.35],
        ],
      ],
    }),
    status: "confirmed",
    confirmedAt: "2026-01-01T00:00:00.000Z",
  };
}

function playerLocationPayload(role: "seeker" | "hider" = "seeker") {
  return {
    lat: 53.35,
    lng: -6.26,
    updatedAt: "2026-01-01T00:00:00.000Z",
    role,
  };
}

function timeTrapPayload() {
  return {
    stationId: "station-1",
    stationName: "Test Station",
    center: { lat: 53.35, lng: -6.26 },
    bonusMinutes: 5,
    placedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("firestore.rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(
          resolve(process.cwd(), "firestore.rules"),
          "utf8",
        ),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("allows a signed-in host to create a free session", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .set(sessionPayload("host-1")),
    );
  });

  it("denies client-supplied server-only ops fields on session create", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-version")
        .set(
          sessionPayload("host-1", {
            requiredMinAppVersion: "9.9.9.9",
          }),
        ),
    );
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-set-at")
        .set(
          sessionPayload("host-1", {
            requiredMinAppVersionSetAt: "2026-01-01T00:00:00.000Z",
          }),
        ),
    );
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-grace")
        .set(
          sessionPayload("host-1", {
            requiredMinAppVersionGraceSeconds: 30,
          }),
        ),
    );
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-mitigation")
        .set(
          sessionPayload("host-1", {
            opsMitigation: {
              id: "m1",
              type: "soft_reload",
              appliedAt: "2026-01-01T00:00:00.000Z",
              appliedByUid: "admin-1",
              incidentId: "inc-1",
            },
          }),
        ),
    );
  });

  it("allows signed-in users to look up session codes without reading session docs", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest.firestore().collection("sessionCodes").doc("ABCD").get(),
    );
    await assertFails(
      guest.firestore().collection("sessions").doc("session-1").get(),
    );
  });

  it("lets only the host mark a session code as ended", async () => {
    const host = testEnv.authenticatedContext("host-1");
    const codeDoc = () =>
      host.firestore().collection("sessionCodes").doc("ABCD");
    await codeDoc().set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessionCodes")
        .doc("ABCD")
        .update({ status: "ended" }),
    );
    await assertFails(codeDoc().update({ status: "archived" }));
    await assertFails(
      codeDoc().update({ status: "ended", sessionId: "session-2" }),
    );
    await assertSucceeds(codeDoc().update({ status: "ended" }));
  });

  it("allows a guest to join an active session as hider with memberAppVersions", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          hostAppVersion: "0.2.1",
        }),
      );
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "hider" },
          memberAppVersions: { "guest-1": "0.2.1" },
        }),
    );
  });

  it("allows membership heal without client hostUid writes", async () => {
    const host = testEnv.authenticatedContext("host-old");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-old", {
          memberUids: ["host-old", "seeker-a"],
          memberRoles: { "host-old": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "host-old": "0.10.8", "seeker-a": "0.10.8" },
        }),
      );

    const returning = testEnv.authenticatedContext("uid-new");
    await assertSucceeds(
      returning
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["uid-new", "seeker-a"],
          memberRoles: { "uid-new": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "uid-new": "0.10.8", "seeker-a": "0.10.8" },
        }),
    );
  });

  it("denies client hostUid transfer even when the old host is removed", async () => {
    const host = testEnv.authenticatedContext("host-old");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-old", {
          memberUids: ["host-old", "seeker-a"],
          memberRoles: { "host-old": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "host-old": "0.10.8", "seeker-a": "0.10.8" },
        }),
      );

    const returning = testEnv.authenticatedContext("uid-new");
    await assertFails(
      returning
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hostUid: "uid-new",
          memberUids: ["uid-new", "seeker-a"],
          memberRoles: { "uid-new": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "uid-new": "0.10.8", "seeker-a": "0.10.8" },
        }),
    );
  });

  it("denies hostUid transfer when the old host remains a member", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
        }),
      );

    const guest = testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hostUid: "guest-1",
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
        }),
    );
  });

  it("allows session members to update lastActiveAt only", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = testEnv.authenticatedContext("guest-1");
    await guest
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "hider" },
      });

    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({ lastActiveAt: "2026-07-12T12:00:00.000Z" }),
    );

    await assertFails(
      testEnv
        .authenticatedContext("outsider-1")
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({ lastActiveAt: "2026-07-12T12:00:00.000Z" }),
    );

    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          lastActiveAt: "2026-07-12T12:00:00.000Z",
          code: "WXYZ",
        }),
    );

    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({ lastActiveAt: "2099-01-01T00:00:00.000Z" }),
    );
  });

  it("allows a second guest to join as hider when one hider is already in the session", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    const guest = testEnv.authenticatedContext("guest-2");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "hider-1", "guest-2"],
          memberRoles: {
            "host-1": "seeker",
            "hider-1": "hider",
            "guest-2": "hider",
          },
        }),
    );
  });

  it("allows a returning member to change role on join", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
      });

    const guest = testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "hider" },
        }),
    );
  });

  it("denies premium session creation without host access claim", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-premium")
        .set(sessionPayload("host-1", { tier: "premium" })),
    );
  });

  it("allows users to read their own entitlements doc only", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host.firestore().collection("users").doc("host-1").get(),
    );

    const guest = testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest.firestore().collection("users").doc("host-1").get(),
    );
    await assertFails(
      host.firestore().collection("users").doc("host-1").set({
        premiumSessionCredits: 5,
      }),
    );
  });

  it("allows seeker members to read and write annotations", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = testEnv.authenticatedContext("guest-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
      });

    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  it("denies annotation writes from hiders", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  it("allows hiders to write their own hiding zone", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .set(hidingZonePayload()),
    );
  });

  it("denies seekers from writing hiding zones", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1"],
        memberRoles: { "host-1": "seeker", "seeker-1": "seeker" },
      });

    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("seeker-1")
        .set(hidingZonePayload()),
    );
  });

  it("scopes player location reads so seekers cannot read hider GPS", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "seeker-1": "seeker",
          "hider-1": "hider",
        },
      });

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .set(playerLocationPayload("seeker")),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .get(),
    );
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .get(),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .get(),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .get(),
    );
  });

  it("allows a player to delete only their own live location", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "seeker-1": "seeker",
          "hider-1": "hider",
        },
      });

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .set(playerLocationPayload("seeker")),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .delete(),
    );
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .delete(),
    );
    await assertFails(
      testEnv
        .unauthenticatedContext()
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .delete(),
    );
  });

  it("allows seekers to list only seeker player locations when hider docs exist", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "seeker-1": "seeker",
          "hider-1": "hider",
        },
      });

    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("playerLocations")
      .doc("host-1")
      .set(playerLocationPayload("seeker"));
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    const seekerSnapshot = await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "seeker")
        .get(),
    );
    expect(seekerSnapshot.docs.map((doc) => doc.id).sort()).toEqual(["host-1"]);
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "hider")
        .get(),
    );
  });

  it("allows observers to read seeker and hider player locations", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const observer = adminContext(testEnv, "observer-1");
    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "observer-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "observer-1": "observer",
          "hider-1": "hider",
        },
      });

    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("playerLocations")
      .doc("host-1")
      .set(playerLocationPayload("seeker"));
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("host-1")
        .get(),
    );
    await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .get(),
    );

    const seekerSnapshot = await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "seeker")
        .get(),
    );
    expect(seekerSnapshot.docs.map((doc) => doc.id).sort()).toEqual(["host-1"]);

    const hiderSnapshot = await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "hider")
        .get(),
    );
    expect(hiderSnapshot.docs.map((doc) => doc.id).sort()).toEqual(["hider-1"]);
  });

  it("denies hiders from writing another player's hiding zone doc", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("other-hider")
        .set(hidingZonePayload()),
    );
  });

  it("allows hiders to write their own time trap", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("timeTraps")
        .doc("hider-1")
        .set(timeTrapPayload()),
    );
  });

  it("denies seekers from writing time traps", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1"],
        memberRoles: { "host-1": "seeker", "seeker-1": "seeker" },
      });

    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("timeTraps")
        .doc("seeker-1")
        .set(timeTrapPayload()),
    );
  });

  it("denies hiders from writing another player's time trap doc", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("timeTraps")
        .doc("other-hider")
        .set(timeTrapPayload()),
    );
  });

  it("allows hiders to post game system messages", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-1")
        .set({
          channel: "game",
          senderUid: "hider-1",
          senderRole: "hider",
          createdAt: "2026-01-01T00:00:00.000Z",
          kind: "system",
          text: "Hider confirmed zone at Dublin Central.",
        }),
    );
  });

  it("denies annotation writes from non-members", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const outsider = testEnv.authenticatedContext("outsider-1");
    await assertFails(
      outsider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  it("allows the host to end a session", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endedAt: "2026-01-02T00:00:00.000Z",
        status: "ended",
        code: deleteField(),
      }),
    );
  });

  it("allows the host to update timer fields", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        timerAccumulatedMs: 120_000,
        timerRunningSince: "2026-01-01T00:01:00.000Z",
      }),
    );
  });

  it("allows the host to reset session progress", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1"),
        timerAccumulatedMs: 120_000,
        timerRunningSince: "2026-01-01T00:01:00.000Z",
      });

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        sessionResetAt: "2026-01-02T00:00:00.000Z",
        timerAccumulatedMs: 0,
        timerRunningSince: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("scopes end-game truth anchors so seekers cannot read freeze coords", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-1", "hider-1", "observer-1"],
          memberRoles: {
            "host-1": "seeker",
            "seeker-1": "seeker",
            "hider-1": "hider",
            "observer-1": "observer",
          },
        }),
      );

    const seeker = testEnv.authenticatedContext("seeker-1");
    const observer = testEnv.authenticatedContext("observer-1");
    const hider = testEnv.authenticatedContext("hider-1");

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .get(),
    );
    await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .get(),
    );
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .get(),
    );

    const sessionSnap = await assertSucceeds(
      seeker.firestore().collection("sessions").doc("session-1").get(),
    );
    expect(sessionSnap.data()?.endGameTruthAnchors).toBeUndefined();
  });

  it("denies malformed seeker end-game truth anchors", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": { foo: 1 },
          },
        }),
    );
  });

  it("denies seeker end-game truth anchor updates after create", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.36,
              lng: -6.27,
              frozenAt: "2026-01-01T00:02:00.000Z",
            },
          },
        }),
    );
  });

  it("allows a seeker to start end game when freeze anchors already exist", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies starting end game without freeze anchors", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertFails(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies a non-member from starting end game directly", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    const stranger = testEnv.authenticatedContext("stranger-1");
    await assertFails(
      stranger.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "stranger-1",
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows the host to clear active end game fields", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          endGameStartedAt: "2026-01-01T00:01:00.000Z",
          endGameStartedByUid: "host-1",
        }),
      });

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies writing freeze coords onto the shared session document", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertFails(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: {
          "hider-1": {
            lat: 53.35,
            lng: -6.26,
            frozenAt: "2026-01-01T00:01:00.000Z",
          },
        },
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows the host to reset session progress with end-game anchors cleared", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1"),
        timerAccumulatedMs: 120_000,
        timerRunningSince: "2026-01-01T00:01:00.000Z",
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "hider-1",
      });

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        sessionResetAt: "2026-01-02T00:00:00.000Z",
        timerAccumulatedMs: 0,
        timerRunningSince: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("rejects session reset from non-host members", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        sessionResetAt: "2026-01-02T00:00:00.000Z",
        timerAccumulatedMs: 0,
        timerRunningSince: deleteField(),
      }),
    );
  });

  it("allows a seeker to request found hider", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    const seeker = testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T01:00:00.000Z",
        foundRequestedByUid: "host-1",
      }),
    );
  });

  it("denies found request from a hider", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertFails(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T01:00:00.000Z",
        foundRequestedByUid: "hider-1",
      }),
    );
  });

  it("denies duplicate found request while one is pending", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1", "seeker-2"],
          memberRoles: {
            "host-1": "seeker",
            "hider-1": "hider",
            "seeker-2": "seeker",
          },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const seeker = testEnv.authenticatedContext("seeker-2");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T01:05:00.000Z",
        foundRequestedByUid: "seeker-2",
      }),
    );
  });

  it("allows a hider to confirm found with client confirmFoundHiderSession shape", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const hider = testEnv.authenticatedContext("hider-1");
    // Mirrors confirmFoundHiderSession: confirm + clear request + clear end-game keys.
    await assertSucceeds(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundConfirmedAt: "2026-01-01T01:05:00.000Z",
        foundConfirmedByUid: "hider-1",
        gameOutcome: "found",
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows a hider to confirm found while end game is active", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
          endGameStartedAt: "2026-01-01T00:30:00.000Z",
          endGameStartedByUid: "hider-1",
          endGameTruthAnchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:30:00.000Z",
            },
          },
        }),
      );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundConfirmedAt: "2026-01-01T01:05:00.000Z",
        foundConfirmedByUid: "hider-1",
        gameOutcome: "found",
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows a hider to decline a found request", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows the requesting seeker to cancel a found request", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const seeker = testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies a non-requesting seeker from cancelling a found request", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1", "seeker-2"],
          memberRoles: {
            "host-1": "seeker",
            "hider-1": "hider",
            "seeker-2": "seeker",
          },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const otherSeeker = testEnv.authenticatedContext("seeker-2");
    await assertFails(
      otherSeeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies a seeker from confirming found hider", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const seeker = testEnv.authenticatedContext("host-1");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundConfirmedAt: "2026-01-01T01:05:00.000Z",
        foundConfirmedByUid: "host-1",
        gameOutcome: "found",
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies found request after the session has ended", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("sessions").doc("session-1").set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          status: "ended",
          endedAt: "2026-01-01T02:00:00.000Z",
        }),
      );
    });

    const seeker = testEnv.authenticatedContext("host-1");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T02:05:00.000Z",
        foundRequestedByUid: "host-1",
      }),
    );
  });

  it("rejects invalid annotation types", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set({
          ...annotationPayload(),
          type: "invalid",
        }),
    );
  });

  it("requires sign-in for session reads", async () => {
    const unauthenticated = testEnv.unauthenticatedContext();
    await assertFails(
      unauthenticated
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .get(),
    );
  });

  it("denies session collection listing for non-members", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const outsider = testEnv.authenticatedContext("outsider-1");
    await assertFails(
      outsider.firestore().collection("sessions").get(),
    );
  });

  it("allows seeker walking thermometer flow and hider answer after pending", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    const questionRef = host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("pendingQuestions")
      .doc("pq-walk");

    await assertSucceeds(
      questionRef.set({
        toolType: "thermometer",
        createdByUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "walking",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [-6.26, 53.35] },
          }),
          metadata: { thermometerDistanceMeters: 1609.344 },
        },
        replyOptions: [],
        promptText: "Thermometer walk started",
      }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-walk")
        .update({ answer: "hotter", status: "answered" }),
    );

    await assertSucceeds(
      questionRef.update({
        status: "pending",
        answerableAt: "2026-01-01T00:05:00.000Z",
        promptText: "After traveling 1 mile, am I hotter or colder?",
        replyOptions: [
          { id: "hotter", label: "Hotter" },
          { id: "colder", label: "Colder" },
        ],
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [-6.26, 53.35],
                [-6.25, 53.36],
              ],
            },
          }),
          metadata: { thermometerDistanceMeters: 1609.344 },
        },
      }),
    );

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-walk")
        .update({ answer: "hotter", status: "answered" }),
    );
  });

  it("allows walk creator to cancel own walking thermometer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    const seeker = testEnv.authenticatedContext("seeker-2");
    const questionRef = seeker
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("pendingQuestions")
      .doc("pq-own-walk");

    await assertSucceeds(
      questionRef.set({
        toolType: "thermometer",
        createdByUid: "seeker-2",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "walking",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [-6.26, 53.35] },
          }),
          metadata: {},
        },
        replyOptions: [],
        promptText: "Thermometer walk started",
      }),
    );

    await assertSucceeds(questionRef.update({ status: "cancelled" }));
  });

  it("allows seeker to cancel expired pending question", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-expired")
        .set({
          toolType: "radar",
          createdByUid: "seeker-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          deadlineExpiredAt: "2026-01-01T00:05:00.000Z",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Are you within 1 mile?",
        });
    });

    const seeker = testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-expired")
        .update({ status: "cancelled" }),
    );
  });

  it("denies seeker cancel of pending question without deadlineExpiredAt", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-open")
        .set({
          toolType: "radar",
          createdByUid: "seeker-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Are you within 1 mile?",
        });
    });

    const seeker = testEnv.authenticatedContext("seeker-2");
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-open")
        .update({ status: "cancelled" }),
    );
  });

  it("allows seeker to cancel expired game question message", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-expired")
        .set({
          channel: "game",
          kind: "question",
          senderUid: "seeker-2",
          senderRole: "seeker",
          createdAt: "2026-01-01T00:00:00.000Z",
          pendingQuestionId: "pq-expired",
          promptText: "Are you within 1 mile?",
          status: "pending",
        });
    });

    const seeker = testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-expired")
        .update({ status: "cancelled" }),
    );
  });

  it("allows seeker to cancel orphan walking thermometer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-orphan-walk")
        .set({
          toolType: "thermometer",
          createdByUid: "gone-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "walking",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Thermometer walk started",
        });
    });

    const seeker = testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-orphan-walk")
        .update({ status: "cancelled" }),
    );
  });

  it("denies non-host seeker cancelling another member's active walking thermometer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2", "seeker-3"],
          memberRoles: {
            "host-1": "seeker",
            "seeker-2": "seeker",
            "seeker-3": "seeker",
          },
        }),
      );

    const walker = testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      walker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-member-walk")
        .set({
          toolType: "thermometer",
          createdByUid: "seeker-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "walking",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Thermometer walk started",
        }),
    );

    const otherSeeker = testEnv.authenticatedContext("seeker-3");
    await assertFails(
      otherSeeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-member-walk")
        .update({ status: "cancelled" }),
    );
  });

  it("allows hider to answer a radar question in game chat", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-radar")
        .set({
          toolType: "radar",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: { radiusMeters: 1609.344 },
          },
          replyOptions: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          promptText: "Are you within 1.0 mi of me?",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-radar")
        .set({
          channel: "game",
          senderUid: "host-1",
          senderRole: "seeker",
          createdAt: "2026-01-01T00:00:00.000Z",
          kind: "question",
          pendingQuestionId: "pq-radar",
          toolType: "radar",
          promptText: "Are you within 1.0 mi of me?",
          replyOptions: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          status: "pending",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-radar")
        .update({ answer: "yes", status: "answered" }),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-radar")
        .update({ selectedReply: "yes", status: "answered" }),
    );
  });

  it("allows seeker to set answerableAt after creating a pending photo question", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    const questionRef = host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("pendingQuestions")
      .doc("pq-photo-timer");

    await assertSucceeds(
      questionRef.set({
        toolType: "photo",
        createdByUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "pending",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [-6.26, 53.35] },
          }),
        },
        replyOptions: [
          { id: "upload", label: "Upload photo" },
          { id: "cannot", label: "Cannot answer" },
        ],
        promptText: "Send a photo of a red door.",
      }),
    );

    await assertSucceeds(
      questionRef.update({
        answerableAt: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("allows hider to answer a photo question with an uploaded photo", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo")
        .update({
          answer: {
            kind: "photo",
            storagePath: "sessions/session-1/pendingQuestions/pq-photo/photo.jpg",
          },
          status: "answered",
        }),
    );
  });

  it("allows hider to answer a photo question with cannot answer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-na")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-na")
        .update({
          answer: { kind: "cannot_answer" },
          status: "answered",
        }),
    );
  });

  it("allows hider to answer a photo question with sent externally", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-ext")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "sent_externally", label: "Mark sent" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-ext")
        .update({
          answer: { kind: "sent_externally" },
          status: "answered",
        }),
    );
  });

  it("allows hider to answer a photo question late with answeredLate", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-late")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
          deadlineExpiredAt: "2026-01-01T00:10:00.000Z",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-late")
        .update({
          answer: { kind: "cannot_answer" },
          status: "answered",
          answeredLate: true,
        }),
    );
  });

  it("allows hider to update game chat message after photo answer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-msg")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-photo")
        .set({
          channel: "game",
          senderUid: "host-1",
          senderRole: "seeker",
          createdAt: "2026-01-01T00:00:00.000Z",
          kind: "question",
          pendingQuestionId: "pq-photo-msg",
          toolType: "photo",
          promptText: "Send a photo of a tree.",
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          status: "pending",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-msg")
        .update({
          answer: { kind: "cannot_answer" },
          status: "answered",
        }),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-photo")
        .update({ selectedReply: "cannot_answer", status: "answered" }),
    );
  });

  it("stores session documents with expected host uid", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const snapshot = await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .get();

    expect(snapshot.data()?.hostUid).toBe("host-1");
  });

  it("allows session members to register their own device token", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("host-1")
        .set({
          token: "seeker-device-token",
          platform: "ios",
          role: "seeker",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: {
            enabled: true,
            newQuestions: true,
            timerChanges: true,
            chatMessages: false,
            liveActivities: true,
          },
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("hider-1")
        .set({
          token: "hider-device-token",
          platform: "android",
          role: "hider",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: {
            enabled: true,
            newQuestions: true,
            timerChanges: true,
            chatMessages: false,
            liveActivities: true,
          },
        }),
    );

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("host-1")
        .set({
          token: "stolen-token",
          platform: "android",
          role: "seeker",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: { enabled: true },
        }),
    );
  });

  it("allows host to update session rules before timer starts", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

  it("rejects session rules update after timer has started", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          timerAccumulatedMs: 1000,
          timerRunningSince: null,
        }),
      );

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

  it("rejects non-host session rules update", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

  it("allows admin to join as admin and read session data", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const admin = adminContext(testEnv);
    await assertSucceeds(
      admin
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "admin-1"],
          memberRoles: { "host-1": "seeker", "admin-1": "admin" },
        }),
    );

    await assertSucceeds(
      admin.firestore().collection("sessions").doc("session-1").get(),
    );

    await assertSucceeds(
      admin
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .get(),
    );
  });

  it("allows anyone to join as observer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "observer" },
        }),
    );
  });

  it("rejects non-admin admin join", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "admin" },
        }),
    );
  });

  it("rejects observer annotation writes", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "admin-1"],
          memberRoles: { "host-1": "seeker", "admin-1": "observer" },
        }),
      );

    const observer = adminContext(testEnv);
    await assertFails(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  async function seedIncident() {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.collection("incidents").doc("inc-1").set({
        status: "open",
        reporterUid: "reporter-1",
        sessionId: "session-1",
        sessionCode: "ABCD",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      await db
        .collection("incidents")
        .doc("inc-1")
        .collection("messages")
        .doc("msg-1")
        .set({
          sender: "system",
          kind: "prompt",
          text: "Incident report",
          createdAt: "2026-01-01T00:00:00.000Z",
        });
    });
  }

  it("allows admin to read an incident and its messages", async () => {
    await seedIncident();
    const admin = adminContext(testEnv);
    await assertSucceeds(
      admin.firestore().collection("incidents").doc("inc-1").get(),
    );
    await assertSucceeds(
      admin
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("messages")
        .doc("msg-1")
        .get(),
    );
  });

  it("allows the reporter to read their own incident and messages", async () => {
    await seedIncident();
    const reporter = testEnv.authenticatedContext("reporter-1");
    await assertSucceeds(
      reporter.firestore().collection("incidents").doc("inc-1").get(),
    );
    await assertSucceeds(
      reporter
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("messages")
        .doc("msg-1")
        .get(),
    );
  });

  it("denies a stranger reading an incident or its messages", async () => {
    await seedIncident();
    const stranger = testEnv.authenticatedContext("stranger-1");
    await assertFails(
      stranger.firestore().collection("incidents").doc("inc-1").get(),
    );
    await assertFails(
      stranger
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("messages")
        .doc("msg-1")
        .get(),
    );
  });

  it("denies clients creating incidents or messages", async () => {
    await seedIncident();
    const reporter = testEnv.authenticatedContext("reporter-1");
    await assertFails(
      reporter
        .firestore()
        .collection("incidents")
        .doc("inc-2")
        .set({
          status: "open",
          reporterUid: "reporter-1",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
    );
    await assertFails(
      reporter
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("messages")
        .doc("msg-2")
        .set({
          sender: "player",
          kind: "chat",
          text: "hello",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
    );
  });

  async function seedHostConfirm() {
    await seedIncident();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.collection("sessions").doc("session-1").set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "reporter-1"],
          memberRoles: { "host-1": "seeker", "reporter-1": "hider" },
        }),
      );
      await db
        .collection("incidents")
        .doc("inc-1")
        .collection("hostConfirms")
        .doc("confirm-1")
        .set({
          id: "confirm-1",
          incidentId: "inc-1",
          sessionId: "session-1",
          tool: "reset_board",
          args: {},
          argsHash: "abc",
          status: "pending",
          hostUid: "host-1",
          requestedByUid: "agent-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-01T00:05:00.000Z",
        });
    });
  }

  it("allows the session host to read hostConfirms but not write them", async () => {
    await seedHostConfirm();
    const host = testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("hostConfirms")
        .doc("confirm-1")
        .get(),
    );
    await assertFails(
      host
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("hostConfirms")
        .doc("confirm-1")
        .update({ status: "approved" }),
    );
  });

  it("denies a non-host stranger reading hostConfirms", async () => {
    await seedHostConfirm();
    const stranger = testEnv.authenticatedContext("stranger-1");
    await assertFails(
      stranger
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("hostConfirms")
        .doc("confirm-1")
        .get(),
    );
  });

  it("allows the reporter to read hostConfirms (status only; approve via callable)", async () => {
    await seedHostConfirm();
    const reporter = testEnv.authenticatedContext("reporter-1");
    await assertSucceeds(
      reporter
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("hostConfirms")
        .doc("confirm-1")
        .get(),
    );
  });

  async function seedIncidentThreads() {
    await seedIncident();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.collection("sessions").doc("session-1").set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "reporter-1", "member-1"],
          memberRoles: {
            "host-1": "seeker",
            "reporter-1": "hider",
            "member-1": "hider",
          },
        }),
      );
      await db
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("support")
        .set({ id: "support", visibility: "support" });
      await db
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("support")
        .collection("messages")
        .doc("support-msg-1")
        .set({
          sender: "ops_agent",
          kind: "status",
          text: "Looking into it",
          visibility: "support",
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      await db
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("hotfix")
        .set({ id: "hotfix", visibility: "hotfix" });
      await db
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("hotfix")
        .collection("messages")
        .doc("hotfix-msg-1")
        .set({
          sender: "hotfix_agent",
          kind: "agent_meta",
          text: "Agent launched",
          visibility: "hotfix",
          createdAt: "2026-01-01T00:00:00.000Z",
        });
    });
  }

  it("allows reporter, host, and session members to read the support thread", async () => {
    await seedIncidentThreads();

    for (const uid of ["reporter-1", "host-1", "member-1"]) {
      const client = testEnv.authenticatedContext(uid);
      await assertSucceeds(
        client
          .firestore()
          .collection("incidents")
          .doc("inc-1")
          .collection("threads")
          .doc("support")
          .collection("messages")
          .doc("support-msg-1")
          .get(),
      );
    }
  });

  it("allows admin to read support and hotfix threads", async () => {
    await seedIncidentThreads();
    const admin = adminContext(testEnv);
    await assertSucceeds(
      admin
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("support")
        .collection("messages")
        .doc("support-msg-1")
        .get(),
    );
    await assertSucceeds(
      admin
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("hotfix")
        .collection("messages")
        .doc("hotfix-msg-1")
        .get(),
    );
  });

  it("denies reporter and host reading the hotfix thread (admin-only)", async () => {
    await seedIncidentThreads();

    for (const uid of ["reporter-1", "host-1", "member-1", "stranger-1"]) {
      const client = testEnv.authenticatedContext(uid);
      await assertFails(
        client
          .firestore()
          .collection("incidents")
          .doc("inc-1")
          .collection("threads")
          .doc("hotfix")
          .collection("messages")
          .doc("hotfix-msg-1")
          .get(),
      );
    }
  });

  it("denies clients writing thread messages", async () => {
    await seedIncidentThreads();
    const reporter = testEnv.authenticatedContext("reporter-1");
    await assertFails(
      reporter
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("support")
        .collection("messages")
        .doc("support-msg-2")
        .set({
          sender: "player",
          kind: "chat",
          text: "inject",
          visibility: "support",
          createdAt: "2026-01-01T00:01:00.000Z",
        }),
    );
    const admin = adminContext(testEnv);
    await assertFails(
      admin
        .firestore()
        .collection("incidents")
        .doc("inc-1")
        .collection("threads")
        .doc("hotfix")
        .collection("messages")
        .doc("hotfix-msg-2")
        .set({
          sender: "admin",
          kind: "chat",
          text: "nope",
          visibility: "hotfix",
          createdAt: "2026-01-01T00:01:00.000Z",
        }),
    );
  });

  it("allows signed-in clients to read appConfig but not write it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("appConfig").doc("runtime").set({
        requiredMinAppVersion: "0.9.5.1",
        hotfixGraceSeconds: 30,
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
    });

    const client = testEnv.authenticatedContext("player-1");
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

  describe("activityLog", () => {
    function activityLogPayload(
      overrides: Record<string, unknown> = {},
    ): Record<string, unknown> {
      return {
        type: "session_started",
        createdAt: "2026-07-25T10:00:00.000Z",
        payload: {},
        ...overrides,
      };
    }

    async function seedSessionWithMember(memberUid: string) {
      const host = testEnv.authenticatedContext("host-1");
      await host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .set(sessionPayload("host-1"));
      await host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", memberUid],
          memberRoles: { "host-1": "seeker", [memberUid]: "hider" },
        });
      return host;
    }

    it("allows session members to create and read activity log events", async () => {
      await seedSessionWithMember("hider-1");
      const hider = testEnv.authenticatedContext("hider-1");
      const eventRef = hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("activityLog")
        .doc("session_started");

      await assertSucceeds(eventRef.set(activityLogPayload()));
      await assertSucceeds(eventRef.get());
    });

    it("denies activity log updates and deletes", async () => {
      await seedSessionWithMember("hider-1");
      const hider = testEnv.authenticatedContext("hider-1");
      const eventRef = hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("activityLog")
        .doc("session_started");

      await assertSucceeds(eventRef.set(activityLogPayload()));
      await assertFails(
        eventRef.update({
          payload: { summary: "tampered" },
        }),
      );
      await assertFails(eventRef.delete());
    });

    it("denies non-members from creating or reading activity log events", async () => {
      await seedSessionWithMember("hider-1");
      const stranger = testEnv.authenticatedContext("stranger-1");
      const eventRef = stranger
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("activityLog")
        .doc("session_started");

      await assertFails(eventRef.set(activityLogPayload()));
      await assertFails(eventRef.get());
    });

    it("denies activity log creates with invalid type", async () => {
      await seedSessionWithMember("hider-1");
      const hider = testEnv.authenticatedContext("hider-1");

      await assertFails(
        hider
          .firestore()
          .collection("sessions")
          .doc("session-1")
          .collection("activityLog")
          .doc("bad")
          .set(
            activityLogPayload({
              type: "timer_paused",
            }),
          ),
      );
    });
  });

  describe("role passcodes", () => {
    it("denies client membership join on gated sessions", async () => {
      const host = testEnv.authenticatedContext("host-1");
      await host
        .firestore()
        .collection("sessions")
        .doc("session-gated")
        .set(
          sessionPayload("host-1", {
            roleGates: { version: 1, leaders: { seeker: "host-1" } },
          }),
        );

      const guest = testEnv.authenticatedContext("guest-1");
      await assertFails(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-gated")
          .update({
            memberUids: ["host-1", "guest-1"],
            memberRoles: { "host-1": "seeker", "guest-1": "hider" },
            memberAppVersions: { "guest-1": "0.2.1" },
          }),
      );
    });

    it("denies client reads of sessionRoleSecrets", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection("sessionRoleSecrets")
          .doc("session-gated")
          .set({ observer: { code: "OBSV", salt: "s", hash: "h" } });
      });

      const host = testEnv.authenticatedContext("host-1");
      await assertFails(
        host.firestore().collection("sessionRoleSecrets").doc("session-gated").get(),
      );
    });

    it("still allows legacy membership join without roleGates", async () => {
      const host = testEnv.authenticatedContext("host-1");
      await host
        .firestore()
        .collection("sessions")
        .doc("session-legacy")
        .set(sessionPayload("host-1"));

      const guest = testEnv.authenticatedContext("guest-1");
      await assertSucceeds(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-legacy")
          .update({
            memberUids: ["host-1", "guest-1"],
            memberRoles: { "host-1": "seeker", "guest-1": "hider" },
            memberAppVersions: { "guest-1": "0.2.1" },
          }),
      );
    });
  });

  describe("joinRequests", () => {
    const joinRequestPayload = {
      requesterUid: "guest-1",
      role: "seeker",
      status: "pending",
      identityLabel: "ada",
      createdAt: "2026-08-03T12:00:00.000Z",
      expiresAt: "2026-08-03T12:10:00.000Z",
      sessionId: "session-join-req",
    };

    async function seedGatedSessionWithJoinRequest() {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .set(
            sessionPayload("host-1", {
              memberUids: ["host-1", "seeker-1"],
              memberRoles: { "host-1": "hider", "seeker-1": "seeker" },
              roleGates: {
                version: 1,
                leaders: { hider: "host-1", seeker: "seeker-1" },
              },
            }),
          );
        await context
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .set(joinRequestPayload);
      });
    }

    it("allows requester to read own join request", async () => {
      await seedGatedSessionWithJoinRequest();
      const guest = testEnv.authenticatedContext("guest-1");
      await assertSucceeds(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .get(),
      );
    });

    it("allows role leader to read pending join request", async () => {
      await seedGatedSessionWithJoinRequest();
      const leader = testEnv.authenticatedContext("seeker-1");
      await assertSucceeds(
        leader
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .get(),
      );
    });

    it("denies unrelated member read of join request", async () => {
      await seedGatedSessionWithJoinRequest();
      const host = testEnv.authenticatedContext("host-1");
      await assertFails(
        host
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .get(),
      );
    });

    it("denies client writes to joinRequests", async () => {
      await seedGatedSessionWithJoinRequest();
      const guest = testEnv.authenticatedContext("guest-1");
      await assertFails(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-2")
          .set(joinRequestPayload),
      );
      await assertFails(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .update({ status: "cancelled" }),
      );
    });
  });
});
