import test from "node:test";
import assert from "node:assert/strict";
import {
  TRIAGE_OUTCOME_AGENT,
  TRIAGE_OUTCOME_HUMAN,
  triageIncidentDiagnostics,
} from "../incident/incidentTriage.mjs";

test("triageIncidentDiagnostics returns agent for TypeError", () => {
  const result = triageIncidentDiagnostics({
    lastClientErrors: [
      {
        name: "TypeError",
        message: "x.map is not a function",
        at: "2026-07-25T12:00:00.000Z",
      },
    ],
  });
  assert.equal(result.outcome, TRIAGE_OUTCOME_AGENT);
  assert.equal(result.reason, "client_exception");
  assert.equal(result.matchedErrorName, "TypeError");
});

test("triageIncidentDiagnostics returns agent when sentryEventId present", () => {
  const result = triageIncidentDiagnostics({
    lastClientErrors: [
      {
        name: "Error",
        message: "something odd",
        at: "2026-07-25T12:00:00.000Z",
        sentryEventId: "abc123",
      },
    ],
  });
  assert.equal(result.outcome, TRIAGE_OUTCOME_AGENT);
  assert.equal(result.reason, "sentry_event");
});

test("triageIncidentDiagnostics returns human without clear bug signals", () => {
  const result = triageIncidentDiagnostics({
    lastClientErrors: [
      { name: "Boom", message: "map felt stuck", at: "2026-07-25T12:00:00.000Z" },
    ],
  });
  assert.equal(result.outcome, TRIAGE_OUTCOME_HUMAN);
  assert.equal(result.reason, "no_clear_bug_signal");
});

test("triageIncidentDiagnostics returns human when errors empty", () => {
  const result = triageIncidentDiagnostics({ lastClientErrors: [] });
  assert.equal(result.outcome, TRIAGE_OUTCOME_HUMAN);
});
