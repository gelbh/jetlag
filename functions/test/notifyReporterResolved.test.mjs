import assert from "node:assert/strict";
import test from "node:test";
import { notifyReporterResolved } from "../incident/notifyReporterResolved.mjs";

function mockDb() {
  const notices = new Map();
  return {
    notices,
    collection(name) {
      assert.equal(name, "users");
      return {
        doc(uid) {
          return {
            collection(sub) {
              if (sub === "incidentNotices") {
                return {
                  doc(incidentId) {
                    return {
                      async set(payload, options) {
                        notices.set(`${uid}/${incidentId}`, {
                          payload,
                          options,
                        });
                      },
                    };
                  },
                };
              }
              throw new Error(`unexpected subcollection: ${sub}`);
            },
          };
        },
      };
    },
  };
}

test("writes notice and emails reporter", async () => {
  const calls = { email: [] };
  const db = mockDb();
  await notifyReporterResolved(
    db,
    { incidentId: "inc-1", reporterUid: "u1" },
    {
      getUserEmail: async () => "p@example.com",
      sendEmail: async (p) => {
        calls.email.push(p);
        return { messageId: "m1" };
      },
      homeUrl: "https://jetlag.gelbhart.dev/",
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      waitForChannels: true,
    },
  );

  const notice = db.notices.get("u1/inc-1");
  assert.ok(notice);
  assert.equal(notice.payload.incidentId, "inc-1");
  assert.equal(notice.payload.status, "resolved");
  assert.equal(notice.payload.resolvedAt, "2026-09-13T12:00:00.000Z");
  assert.equal(notice.payload.bannerDismissedAt, null);
  assert.deepEqual(notice.options, { merge: true });

  assert.equal(calls.email.length, 1);
  assert.equal(calls.email[0].audience, "reporter");
  assert.equal(calls.email[0].to, "p@example.com");
  assert.equal(calls.email[0].subject, "Your Jet Lag issue has been fixed");
  assert.match(calls.email[0].text, /jetlag\.gelbhart\.dev/);
});

test("skips email when getUserEmail returns null; still writes notice", async () => {
  const calls = { email: [] };
  const db = mockDb();
  await notifyReporterResolved(
    db,
    { incidentId: "inc-1", reporterUid: "u1" },
    {
      getUserEmail: async () => null,
      sendEmail: async (p) => {
        calls.email.push(p);
        return { messageId: "m1" };
      },
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      waitForChannels: true,
    },
  );

  assert.ok(db.notices.get("u1/inc-1"));
  assert.equal(calls.email.length, 0);
});

test("swallows email errors", async () => {
  const db = mockDb();
  await assert.doesNotReject(() =>
    notifyReporterResolved(
      db,
      { incidentId: "inc-1", reporterUid: "u1" },
      {
        getUserEmail: async () => "p@example.com",
        sendEmail: async () => {
          throw new Error("email boom");
        },
        now: () => new Date("2026-09-13T12:00:00.000Z"),
        waitForChannels: true,
      },
    ),
  );
  assert.ok(db.notices.get("u1/inc-1"));
});

test("skips when reporterUid or incidentId missing", async () => {
  const db = mockDb();
  const result = await notifyReporterResolved(db, { incidentId: "inc-1" }, {});
  assert.deepEqual(result, { skipped: true });
  assert.equal(db.notices.size, 0);
});
