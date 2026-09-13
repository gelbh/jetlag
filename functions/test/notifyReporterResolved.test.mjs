import test from "node:test";
import assert from "node:assert/strict";
import { notifyReporterResolved } from "../incident/notifyReporterResolved.mjs";

function mockDb({ devices = {} } = {}) {
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
              if (sub === "devices") {
                return {
                  async get() {
                    return {
                      docs: Object.entries(devices).map(([id, data]) => ({
                        id,
                        data: () => data,
                      })),
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
  const calls = { email: [], push: [] };
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
      sendPush: async (p) => {
        calls.push.push(p);
        return { sent: 1 };
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
  assert.equal(calls.push.length, 1);
  assert.deepEqual(calls.push[0], { reporterUid: "u1", incidentId: "inc-1" });
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

test("calls sendPush with reporter payload when present", async () => {
  const calls = { push: [] };
  const db = mockDb({
    devices: {
      ios: {
        token: "tok-1",
        preferences: { enabled: true },
      },
    },
  });
  await notifyReporterResolved(
    db,
    { incidentId: "inc-1", reporterUid: "u1" },
    {
      getUserEmail: async () => null,
      sendPush: async (p) => {
        calls.push.push(p);
        return { sent: 1 };
      },
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      waitForChannels: true,
    },
  );

  assert.equal(calls.push.length, 1);
  assert.deepEqual(calls.push[0], { reporterUid: "u1", incidentId: "inc-1" });
});

test("swallows email and push errors", async () => {
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
        sendPush: async () => {
          throw new Error("push boom");
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

test("sendReporterResolvedPush filters tokens by preferences", async () => {
  const { sendReporterResolvedPush } = await import(
    "../incident/notifyReporterResolved.mjs"
  );
  const sent = [];
  const db = {
    collection(name) {
      assert.equal(name, "users");
      return {
        doc(uid) {
          assert.equal(uid, "u1");
          return {
            collection(sub) {
              assert.equal(sub, "devices");
              return {
                async get() {
                  return {
                    docs: [
                      {
                        id: "ios",
                        data: () => ({
                          token: "tok-on",
                          preferences: { enabled: true },
                        }),
                      },
                      {
                        id: "android",
                        data: () => ({
                          token: "tok-off-event",
                          preferences: {
                            enabled: true,
                            incidentResolved: false,
                          },
                        }),
                      },
                      {
                        id: "web",
                        data: () => ({
                          token: "tok-disabled",
                          preferences: { enabled: false },
                        }),
                      },
                    ],
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await sendReporterResolvedPush(
    db,
    { reporterUid: "u1", incidentId: "inc-1" },
    {
      messaging: {
        async sendEachForMulticast(payload) {
          sent.push(payload);
          return { successCount: payload.tokens.length };
        },
      },
    },
  );

  assert.equal(result.sent, 1);
  assert.deepEqual(sent[0].tokens, ["tok-on"]);
  assert.equal(sent[0].notification.title, "Issue fixed");
  assert.match(sent[0].notification.body, /Jet Lag/i);
  assert.deepEqual(sent[0].data, {
    event: "incident_resolved",
    incidentId: "inc-1",
  });
});
