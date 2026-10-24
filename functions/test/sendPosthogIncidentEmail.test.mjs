import assert from "node:assert/strict";
import test from "node:test";
import { ingestPosthogAlert } from "../incident/ingestPosthogAlert.mjs";
import { sendPosthogIncidentEmail } from "../incident/sendPosthogIncidentEmail.mjs";

function applyUpdate(current, data) {
  const next = structuredClone(current ?? {});
  for (const [key, value] of Object.entries(data)) {
    const parts = key.split(".");
    let target = next;
    for (const part of parts.slice(0, -1)) {
      target[part] = { ...(target[part] ?? {}) };
      target = target[part];
    }
    target[parts.at(-1)] = value;
  }
  return next;
}

function mockDb() {
  const incidents = new Map();

  function incidentRef(id) {
    return {
      id,
      create: async (data) => {
        if (incidents.has(id)) {
          throw Object.assign(new Error("already exists"), { code: 6 });
        }
        incidents.set(id, structuredClone(data));
      },
      get: async () => ({
        exists: incidents.has(id),
        data: () => structuredClone(incidents.get(id)),
      }),
      update: async (data) => {
        incidents.set(id, applyUpdate(incidents.get(id), data));
      },
      collection: () => ({ doc: () => ({ set: async () => {} }) }),
    };
  }

  // Serialized like Firestore's contention retries: one transaction sees the other's write.
  let lock = Promise.resolve();

  return {
    collection: (name) => {
      assert.equal(name, "incidents");
      return { doc: (id) => incidentRef(id) };
    },
    runTransaction: (fn) => {
      const run = lock.then(() =>
        fn({
          get: (ref) => ref.get(),
          update: (ref, data) => {
            incidents.set(ref.id, applyUpdate(incidents.get(ref.id), data));
          },
        }),
      );
      lock = run.catch(() => {});
      return run;
    },
    _incidents: incidents,
  };
}

const ISSUE_ID = "01999a2b-1c3d-7e4f-8a9b-0c1d2e3f4a5b";
const ID = `posthog-${ISSUE_ID}`;
const NOW = () => new Date("2026-10-11T12:00:00.000Z");

function payload(overrides = {}) {
  return {
    issueId: ISSUE_ID,
    name: "TypeError",
    issueUrl: "https://eu.posthog.com/project/232295/error_tracking/fingerprint/fp-1",
    ...overrides,
  };
}

const ingestDeps = { rateLimit: async () => ({ allowed: true }), now: NOW };

function emailDeps(overrides = {}) {
  const emails = [];
  return {
    sendEmail: async (email) => {
      emails.push(email);
      return { messageId: "email-1" };
    },
    now: NOW,
    incidentUrlBase: "https://jetlag.gelbhart.dev/",
    _emails: emails,
    ...overrides,
  };
}

function fire(db, d) {
  return sendPosthogIncidentEmail(db, ID, structuredClone(db._incidents.get(ID)), d);
}

test("sends the requested email for a created PostHog incident and records sentAt", async () => {
  const db = mockDb();
  await ingestPosthogAlert(db, payload(), ingestDeps);
  const d = emailDeps();

  assert.equal(await fire(db, d), "sent");

  assert.equal(d._emails.length, 1);
  assert.equal(d._emails[0].subject, "Jet Lag PostHog issue: TypeError");
  assert.equal(d._emails[0].incidentUrl, `https://jetlag.gelbhart.dev/admin/incidents/${ID}`);
  assert.match(d._emails[0].text, /posthog-01999a2b/);
  assert.match(d._emails[0].text, /https:\/\/eu\.posthog\.com\/project\/232295/);
  assert.deepEqual(db._incidents.get(ID).email, {
    sentAt: "2026-10-11T12:00:00.000Z",
    messageId: "email-1",
  });
});

test("redelivered or follow-up trigger events do not send twice", async () => {
  const db = mockDb();
  await ingestPosthogAlert(db, payload(), ingestDeps);
  const d = emailDeps();
  const stale = structuredClone(db._incidents.get(ID));

  await fire(db, d);
  assert.equal(await fire(db, d), "skipped");
  // A duplicate delivery of the original create event still carries the request.
  assert.equal(await sendPosthogIncidentEmail(db, ID, stale, d), "skipped");

  assert.equal(d._emails.length, 1);
});

test("concurrent deliveries of the same event send once", async () => {
  const db = mockDb();
  await ingestPosthogAlert(db, payload(), ingestDeps);
  const d = emailDeps();

  const results = await Promise.all([fire(db, d), fire(db, d)]);

  assert.deepEqual(results.sort(), ["sent", "skipped"]);
  assert.equal(d._emails.length, 1);
});

test("a reopened incident gets one more email with the reopened subject", async () => {
  const db = mockDb();
  await ingestPosthogAlert(db, payload(), ingestDeps);
  const d = emailDeps();
  await fire(db, d);
  db._incidents.set(ID, { ...db._incidents.get(ID), status: "dismissed" });

  const result = await ingestPosthogAlert(db, payload({ trigger: "reopened" }), ingestDeps);
  assert.equal(result.status, "reopened");
  assert.equal(await fire(db, d), "sent");
  assert.equal(await fire(db, d), "skipped");

  assert.equal(d._emails.length, 2);
  assert.equal(d._emails[1].subject, "Jet Lag PostHog issue reopened: TypeError");
  assert.equal(db._incidents.get(ID).email.sentAt, "2026-10-11T12:00:00.000Z");
});

test("records the failure when the email hop fails", async () => {
  const db = mockDb();
  await ingestPosthogAlert(db, payload(), ingestDeps);
  const d = emailDeps({
    sendEmail: async () => {
      throw new Error("INCIDENT_EMAIL_FAILED:500");
    },
  });

  assert.equal(await fire(db, d), "failed");
  assert.deepEqual(db._incidents.get(ID).email, { error: "email_failed" });
  assert.equal(await fire(db, d), "skipped");
});

test("ignores non-PostHog incidents, deletes and incidents without an email request", async () => {
  const db = mockDb();
  const d = emailDeps();
  db._incidents.set(ID, {
    source: "player_report",
    email: { requestedAt: "2026-10-11T12:00:00.000Z" },
  });

  assert.equal(await fire(db, d), "skipped");
  assert.equal(await sendPosthogIncidentEmail(db, ID, undefined, d), "skipped");
  assert.equal(
    await sendPosthogIncidentEmail(db, ID, { source: "posthog_alert", email: {} }, d),
    "skipped",
  );
  assert.equal(d._emails.length, 0);
});
