import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import {
  bindRulesTestEnv,
  adminContext,
  sessionPayload,
  annotationPayload,
} from "./helpers";

describe("firestore.rules — admin, incidents & support", () => {
  const rules = bindRulesTestEnv();

  it("allows admin to join as admin and read session data", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const admin = adminContext(rules.testEnv);
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
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = rules.testEnv.authenticatedContext("guest-1");
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
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = rules.testEnv.authenticatedContext("guest-1");
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
    const host = rules.testEnv.authenticatedContext("host-1");
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

    const observer = adminContext(rules.testEnv);
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
    await rules.testEnv.withSecurityRulesDisabled(async (ctx) => {
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
    const admin = adminContext(rules.testEnv);
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
    const reporter = rules.testEnv.authenticatedContext("reporter-1");
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
    const stranger = rules.testEnv.authenticatedContext("stranger-1");
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
    const reporter = rules.testEnv.authenticatedContext("reporter-1");
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
    await rules.testEnv.withSecurityRulesDisabled(async (ctx) => {
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
    const host = rules.testEnv.authenticatedContext("host-1");
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
    const stranger = rules.testEnv.authenticatedContext("stranger-1");
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
    const reporter = rules.testEnv.authenticatedContext("reporter-1");
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
    await rules.testEnv.withSecurityRulesDisabled(async (ctx) => {
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
      const client = rules.testEnv.authenticatedContext(uid);
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
    const admin = adminContext(rules.testEnv);
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
      const client = rules.testEnv.authenticatedContext(uid);
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
    const reporter = rules.testEnv.authenticatedContext("reporter-1");
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
    const admin = adminContext(rules.testEnv);
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

});
