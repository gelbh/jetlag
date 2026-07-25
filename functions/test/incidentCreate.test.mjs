import test from "node:test";
import assert from "node:assert/strict";
import {
  createIncidentHandler,
  INCIDENT_INVALID_DIAGNOSTICS,
  INCIDENT_PAYLOAD_TOO_LARGE,
  INCIDENT_RATE_LIMITED,
  INCIDENT_UNAUTHENTICATED,
} from "../incident/createIncident.mjs";
import { buildAdminPrompt } from "../incident/adminPrompt.mjs";

function mockDb() {
  const incidents = new Map();
  const messages = [];

  function incidentRef(id) {
    return {
      id,
      set: async (data) => {
        incidents.set(id, { ...(incidents.get(id) ?? {}), ...data });
      },
      update: async (data) => {
        incidents.set(id, { ...(incidents.get(id) ?? {}), ...data });
      },
      collection: (name) => {
        assert.equal(name, "messages");
        return {
          doc: (msgId) => ({
            set: async (data) => {
              messages.push({ incidentId: id, msgId, ...data });
            },
          }),
        };
      },
    };
  }

  return {
    collection: (name) => {
      assert.equal(name, "incidents");
      return { doc: (id) => incidentRef(id) };
    },
    _incidents: incidents,
    _messages: messages,
  };
}

function baseInput(overrides = {}) {
  return {
    uid: "reporter-1",
    reporterRole: "seeker",
    playerNote: "map froze",
    diagnostics: {
      appVersion: "0.9.5",
      route: "/map",
      sessionId: "sess-1",
      sessionCode: "ABCD",
      lastClientErrors: [{ name: "Boom", at: "2026-01-01T00:00:00Z" }],
      recentOps: ["open-map"],
    },
    ...overrides,
  };
}

function baseDeps(overrides = {}) {
  let counter = 0;
  return {
    rateLimit: async () => ({ allowed: true }),
    sendEmail: async () => ({ messageId: "email-1" }),
    now: () => new Date("2026-07-25T12:00:00.000Z"),
    generateId: () => `id-${(counter += 1)}`,
    incidentUrlBase: "https://jetlag.gelbhart.dev",
    ...overrides,
  };
}

test("createIncidentHandler writes incident + prompt message and returns id", async () => {
  const db = mockDb();
  const result = await createIncidentHandler(db, baseInput(), baseDeps());

  assert.deepEqual(result, { incidentId: "id-1", status: "open" });

  const incident = db._incidents.get("id-1");
  assert.equal(incident.status, "open");
  assert.equal(incident.reporterUid, "reporter-1");
  assert.equal(incident.sessionCode, "ABCD");
  assert.equal(incident.playerNote, "map froze");
  assert.equal(
    incident.adminPrompt,
    buildAdminPrompt({
      incidentId: "id-1",
      status: "open",
      playerNote: "map froze",
      diagnostics: baseInput().diagnostics,
    }),
  );

  const promptMessage = db._messages.find((m) => m.kind === "prompt");
  assert.ok(promptMessage);
  assert.equal(promptMessage.sender, "system");
  assert.equal(promptMessage.text, incident.adminPrompt);
});

test("createIncidentHandler records the email message id", async () => {
  const db = mockDb();
  const sent = [];
  await createIncidentHandler(
    db,
    baseInput(),
    baseDeps({
      sendEmail: async (payload) => {
        sent.push(payload);
        return { messageId: "email-xyz" };
      },
    }),
  );

  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Jet Lag incident id-1 — ABCD/);
  assert.match(sent[0].incidentUrl, /\/admin\/incidents\/id-1$/);

  const incident = db._incidents.get("id-1");
  assert.equal(incident.email.messageId, "email-xyz");
  assert.equal(incident.email.sentAt, "2026-07-25T12:00:00.000Z");
});

test("createIncidentHandler still creates the incident when email fails", async () => {
  const db = mockDb();
  const result = await createIncidentHandler(
    db,
    baseInput(),
    baseDeps({
      sendEmail: async () => {
        throw new Error("INCIDENT_EMAIL_FAILED:502");
      },
    }),
  );

  assert.equal(result.incidentId, "id-1");
  const incident = db._incidents.get("id-1");
  assert.equal(incident.status, "open");
  assert.equal(incident.email.error, "INCIDENT_EMAIL_FAILED:502");
});

test("createIncidentHandler enforces the rate limit", async () => {
  const db = mockDb();
  await assert.rejects(
    createIncidentHandler(
      db,
      baseInput(),
      baseDeps({ rateLimit: async () => ({ allowed: false, retryAfterMs: 1000 }) }),
    ),
    (error) => error.message === INCIDENT_RATE_LIMITED,
  );
  assert.equal(db._incidents.size, 0);
});

test("createIncidentHandler rejects missing auth", async () => {
  const db = mockDb();
  await assert.rejects(
    createIncidentHandler(db, baseInput({ uid: null }), baseDeps()),
    (error) => error.message === INCIDENT_UNAUTHENTICATED,
  );
});

test("createIncidentHandler rejects invalid diagnostics", async () => {
  const db = mockDb();
  await assert.rejects(
    createIncidentHandler(db, baseInput({ diagnostics: { route: "/map" } }), baseDeps()),
    (error) => error.message === INCIDENT_INVALID_DIAGNOSTICS,
  );
});

test("createIncidentHandler rejects oversized diagnostics", async () => {
  const db = mockDb();
  const huge = baseInput({
    diagnostics: {
      appVersion: "0.9.5",
      route: "/map",
      recentOps: [Array.from({ length: 40000 }, () => "x").join("")],
    },
  });
  await assert.rejects(
    createIncidentHandler(db, huge, baseDeps()),
    (error) => error.message === INCIDENT_PAYLOAD_TOO_LARGE,
  );
});

test("createIncidentHandler clamps the player note to 140 characters", async () => {
  const db = mockDb();
  await createIncidentHandler(
    db,
    baseInput({ playerNote: "a".repeat(200) }),
    baseDeps(),
  );
  const incident = db._incidents.get("id-1");
  assert.equal(incident.playerNote.length, 140);
});
