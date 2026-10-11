import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  handlePosthogAlertRequest,
  ingestPosthogAlert,
  POSTHOG_ALERT_INVALID_PAYLOAD,
  POSTHOG_ALERT_MAX_BODY_BYTES,
} from "../incident/ingestPosthogAlert.mjs";

function mockDb() {
  const incidents = new Map();
  const messages = [];

  function incidentRef(id) {
    return {
      id,
      create: async (data) => {
        if (incidents.has(id)) {
          throw Object.assign(new Error("already exists"), { code: 6 });
        }
        incidents.set(id, { ...data });
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

const ISSUE_ID = "01999a2b-1c3d-7e4f-8a9b-0c1d2e3f4a5b";

function payload(overrides = {}) {
  return {
    issueId: ISSUE_ID,
    name: "TypeError",
    description: "Cannot read properties of undefined (reading 'lat')",
    fingerprint: "fp-1",
    exceptionTimestamp: "2026-10-11T11:59:00.000Z",
    issueUrl: "https://eu.posthog.com/project/232295/error_tracking/fingerprint/fp-1",
    ...overrides,
  };
}

function deps(overrides = {}) {
  let counter = 0;
  const emails = [];
  return {
    rateLimit: async () => ({ allowed: true }),
    sendEmail: async (email) => {
      emails.push(email);
      return { messageId: "email-1" };
    },
    now: () => new Date("2026-10-11T12:00:00.000Z"),
    generateId: () => `msg-${(counter += 1)}`,
    incidentUrlBase: "https://jetlag.gelbhart.dev/",
    _emails: emails,
    ...overrides,
  };
}

test("creates an admin-visible incident with a PostHog issue link and emails the admin", async () => {
  const db = mockDb();
  const d = deps();
  const result = await ingestPosthogAlert(db, payload(), d);

  const id = `posthog-${ISSUE_ID}`;
  assert.deepEqual(result, { status: "created", incidentId: id });
  const doc = db._incidents.get(id);
  assert.equal(doc.status, "open");
  assert.equal(doc.source, "posthog_alert");
  assert.equal(doc.reporterUid, null);
  assert.equal(doc.sessionCode, null);
  assert.deepEqual(doc.posthogIssue, {
    id: ISSUE_ID,
    name: "TypeError",
    url: "https://eu.posthog.com/project/232295/error_tracking/fingerprint/fp-1",
  });
  assert.deepEqual(doc.triage, { outcome: "admin", reason: "posthog_alert" });
  assert.equal(doc.diagnostics.route, "posthog");
  assert.equal(doc.diagnostics.appVersion, "unknown");
  assert.deepEqual(doc.diagnostics.recentOps, []);
  assert.deepEqual(doc.diagnostics.lastClientErrors, [
    {
      name: "TypeError",
      message: "Cannot read properties of undefined (reading 'lat')",
      at: "2026-10-11T11:59:00.000Z",
      posthogExceptionId: ISSUE_ID,
    },
  ]);
  assert.match(doc.adminPrompt, /posthog-01999a2b/);
  assert.deepEqual(doc.email, { sentAt: "2026-10-11T12:00:00.000Z", messageId: "email-1" });

  assert.equal(db._messages.length, 1);
  assert.equal(db._messages[0].kind, "prompt");

  assert.equal(d._emails.length, 1);
  assert.equal(d._emails[0].subject, "Jet Lag PostHog issue: TypeError");
  assert.equal(d._emails[0].incidentUrl, `https://jetlag.gelbhart.dev/admin/incidents/${id}`);
  assert.match(d._emails[0].text, /https:\/\/eu\.posthog\.com\/project\/232295/);
});

test("a repeated alert for the same issue is a no-op", async () => {
  const db = mockDb();
  const d = deps();
  await ingestPosthogAlert(db, payload(), d);
  const second = await ingestPosthogAlert(db, payload(), d);

  assert.deepEqual(second, { status: "duplicate", incidentId: `posthog-${ISSUE_ID}` });
  assert.equal(db._messages.length, 1);
  assert.equal(d._emails.length, 1);
});

test("drops alerts over the rate limit without writing", async () => {
  const db = mockDb();
  const calls = [];
  const d = deps({
    rateLimit: async (options) => {
      calls.push(options);
      return { allowed: false };
    },
  });
  const result = await ingestPosthogAlert(db, payload(), d);

  assert.deepEqual(result, { status: "dropped", reason: "rate_limited" });
  assert.equal(db._incidents.size, 0);
  assert.equal(d._emails.length, 0);
  assert.equal(calls[0].route, "posthogErrorAlert");
  assert.equal(calls[0].uid, "posthog");
});

test("still creates the incident when the email fails", async () => {
  const db = mockDb();
  const result = await ingestPosthogAlert(
    db,
    payload(),
    deps({
      sendEmail: async () => {
        throw new Error("INCIDENT_EMAIL_FAILED:500");
      },
    }),
  );

  assert.equal(result.status, "created");
  assert.deepEqual(db._incidents.get(result.incidentId).email, { error: "email_failed" });
});

test("clamps long text and drops non-PostHog issue URLs", async () => {
  const db = mockDb();
  const result = await ingestPosthogAlert(
    db,
    payload({
      name: "N".repeat(500),
      description: "D".repeat(1000),
      issueUrl: "https://evil.example/phish",
      exceptionTimestamp: "not a date",
    }),
    deps(),
  );

  const doc = db._incidents.get(result.incidentId);
  assert.equal(doc.posthogIssue.name.length, 200);
  assert.equal(doc.posthogIssue.url, null);
  assert.equal(doc.diagnostics.lastClientErrors[0].message.length, 300);
  assert.equal(doc.diagnostics.lastClientErrors[0].at, "2026-10-11T12:00:00.000Z");
});

test("rejects payloads without a safe issue id or a name", async () => {
  for (const bad of [
    null,
    "nope",
    payload({ issueId: undefined }),
    payload({ issueId: "../../users/x" }),
    payload({ issueId: "a".repeat(65) }),
    payload({ name: "" }),
    payload({ name: 42 }),
  ]) {
    await assert.rejects(
      ingestPosthogAlert(mockDb(), bad, deps()),
      new RegExp(POSTHOG_ALERT_INVALID_PAYLOAD),
    );
  }
});

const KEY = Buffer.from("0123456789abcdef0123456789abcdef");
const SECRET = `whsec_${KEY.toString("base64")}`;
const NOW = new Date("2026-10-11T12:00:00.000Z");

function signedRequest(body, overrides = {}) {
  const rawBody = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
  const timestamp = String(Math.floor(NOW.getTime() / 1000));
  const signature = createHmac("sha256", KEY)
    .update(`msg-1.${timestamp}.${rawBody}`)
    .digest("base64");
  return {
    method: "POST",
    headers: {
      "webhook-id": "msg-1",
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    },
    rawBody,
    ...overrides,
  };
}

function requestDeps(db = mockDb()) {
  return { db, secret: SECRET, ingest: deps({ now: () => NOW }) };
}

test("request: signed alert creates an incident", async () => {
  const d = requestDeps();
  const res = await handlePosthogAlertRequest(signedRequest(payload()), d);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: "created", incidentId: `posthog-${ISSUE_ID}` });
  assert.equal(d.db._incidents.size, 1);
});

test("request: rejects non-POST, oversized, unsigned, and malformed requests", async () => {
  const d = requestDeps();
  assert.equal(
    (await handlePosthogAlertRequest(signedRequest(payload(), { method: "GET" }), d)).status,
    405,
  );

  const big = signedRequest({
    ...payload(),
    description: "x".repeat(POSTHOG_ALERT_MAX_BODY_BYTES),
  });
  assert.equal((await handlePosthogAlertRequest(big, d)).status, 413);

  const unsigned = signedRequest(payload());
  unsigned.headers["webhook-signature"] = "v1,AAAA";
  assert.equal((await handlePosthogAlertRequest(unsigned, d)).status, 401);

  assert.equal((await handlePosthogAlertRequest(signedRequest("{not json"), d)).status, 400);
  assert.equal(
    (await handlePosthogAlertRequest(signedRequest(payload({ issueId: "../x" })), d)).status,
    400,
  );

  assert.equal(d.db._incidents.size, 0);
});
