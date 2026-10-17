import assert from "node:assert/strict";
import test from "node:test";
import {
  POSTHOG_SWEEP_MAX_PER_RUN,
  POSTHOG_SWEEP_UID,
  sweepPosthogIncidents,
} from "../incident/sweepPosthogIncidents.mjs";

function alertIncident(issueId, overrides = {}) {
  return {
    status: "open",
    source: "posthog_alert",
    posthogIssue: { id: issueId, name: "TypeError", url: null },
    ...overrides,
  };
}

function mockDb(seed) {
  const incidents = new Map(Object.entries(seed));
  const messages = [];
  const updates = [];
  const queries = [];

  function docRef(id) {
    return {
      id,
      get: async () => ({ exists: incidents.has(id), data: () => incidents.get(id) }),
      update: async (data) => {
        updates.push({ id, ...data });
        incidents.set(id, { ...incidents.get(id), ...data });
      },
      collection: (name) => {
        assert.equal(name, "messages");
        return { doc: (msgId) => ({ set: async (data) => messages.push({ id, msgId, ...data }) }) };
      },
    };
  }

  return {
    collection: (name) => {
      assert.equal(name, "incidents");
      return {
        doc: docRef,
        where: (field, op, value) => {
          queries.push([field, op, value]);
          return {
            get: async () => ({
              docs: [...incidents.entries()]
                .filter(([, data]) => op === "==" && data[field] === value)
                .map(([id, data]) => ({ id, data: () => data })),
            }),
          };
        },
      };
    },
    _incidents: incidents,
    _messages: messages,
    _updates: updates,
    _queries: queries,
  };
}

function fakeFetch(statusByIssue) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const issueId = url.split("/").at(-2);
    const entry = statusByIssue[issueId];
    if (entry === undefined) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    if (entry instanceof Error) {
      throw entry;
    }
    return { ok: true, status: 200, json: async () => ({ status: entry }) };
  };
  fn.calls = calls;
  return fn;
}

const now = () => new Date("2026-10-18T05:00:00.000Z");

test("sweep closes resolved and suppressed issues, leaves active and missing ones", async () => {
  const db = mockDb({
    "posthog-a": alertIncident("a"),
    "posthog-b": alertIncident("b"),
    "posthog-c": alertIncident("c"),
    "posthog-d": alertIncident("d"),
  });
  const fetch = fakeFetch({ a: "resolved", b: "suppressed", c: "active" });

  const result = await sweepPosthogIncidents(db, { apiKey: "phx_test", fetch, now });

  assert.deepEqual(result, { checked: 4, resolved: 1, dismissed: 1, skipped: 2 });
  assert.equal(db._incidents.get("posthog-a").status, "resolved");
  assert.equal(db._incidents.get("posthog-b").status, "dismissed");
  assert.equal(db._incidents.get("posthog-c").status, "open");
  assert.equal(db._incidents.get("posthog-d").status, "open");
  assert.equal(db._updates.length, 2);
  assert.ok(db._messages.every((m) => m.createdByUid === POSTHOG_SWEEP_UID));
  assert.equal(fetch.calls[0].init.headers.Authorization, "Bearer phx_test");
  assert.equal(
    fetch.calls[0].url,
    "https://eu.posthog.com/api/projects/232295/error_tracking/issues/a/",
  );
});

test("sweep only queries open docs and ignores player reports", async () => {
  const db = mockDb({
    "posthog-a": alertIncident("a", { status: "mitigating" }),
    "posthog-b": alertIncident("b", { status: "chatting" }),
    player: { status: "open", reporterUid: "u1", diagnostics: {} },
  });
  const fetch = fakeFetch({ a: "resolved", b: "resolved" });

  const result = await sweepPosthogIncidents(db, { apiKey: "k", fetch, now });

  assert.deepEqual(db._queries, [["status", "==", "open"]]);
  assert.deepEqual(result, { checked: 0, resolved: 0, dismissed: 0, skipped: 0 });
  assert.equal(fetch.calls.length, 0);
});

test("sweep treats fetch errors as skip and keeps going", async () => {
  const db = mockDb({
    "posthog-a": alertIncident("a"),
    "posthog-b": alertIncident("b"),
  });
  const fetch = fakeFetch({ a: new Error("network down"), b: "archived" });

  const result = await sweepPosthogIncidents(db, { apiKey: "k", fetch, now });

  assert.deepEqual(result, { checked: 2, resolved: 0, dismissed: 1, skipped: 1 });
});

test("sweep checks at most POSTHOG_SWEEP_MAX_PER_RUN incidents", async () => {
  const seed = {};
  for (let i = 0; i < POSTHOG_SWEEP_MAX_PER_RUN + 5; i += 1) {
    seed[`posthog-${i}`] = alertIncident(String(i));
  }
  const db = mockDb(seed);
  const fetch = fakeFetch({});

  const result = await sweepPosthogIncidents(db, { apiKey: "k", fetch, now });

  assert.equal(result.checked, POSTHOG_SWEEP_MAX_PER_RUN);
  assert.equal(fetch.calls.length, POSTHOG_SWEEP_MAX_PER_RUN);
});
