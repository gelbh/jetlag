import test from "node:test";
import assert from "node:assert/strict";
import { INCIDENT_NOT_FOUND } from "../incident/postIncidentMessage.mjs";
import {
  CURSOR_HOTFIX_ALREADY_LAUNCHED,
  launchIncidentCursorAgentHandler,
} from "../incident/launchIncidentCursorAgent.mjs";
import { CURSOR_HOTFIX_MISCONFIGURED } from "../incident/launchCursorHotfix.mjs";

test("launchIncidentCursorAgentHandler rejects empty incidentId", async () => {
  await assert.rejects(
    launchIncidentCursorAgentHandler({}, { incidentId: "  ", uid: "admin-1" }),
    (error) => error.message === INCIDENT_NOT_FOUND,
  );
});

test("launchIncidentCursorAgentHandler force-launches with forcedByUid", async () => {
  const launches = [];
  const result = await launchIncidentCursorAgentHandler(
    {},
    { incidentId: "inc-1", uid: "admin-9" },
    {
      launchCursorHotfix: async (_db, input, deps) => {
        launches.push({ input, deps });
        return {
          launched: true,
          agentId: "bc-1",
          agentUrl: "https://cursor.com/agents/bc-1",
          runId: "run-1",
        };
      },
      launchDeps: { apiKey: "k", repositoryUrl: "https://github.com/gelbh/jetlag" },
    },
  );

  assert.equal(result.launched, true);
  assert.equal(result.agentId, "bc-1");
  assert.equal(result.status, "launched");
  assert.equal(launches.length, 1);
  assert.equal(launches[0].input.force, true);
  assert.equal(launches[0].input.forcedByUid, "admin-9");
  assert.equal(launches[0].input.incidentId, "inc-1");
});

test("launchIncidentCursorAgentHandler maps not_found", async () => {
  await assert.rejects(
    launchIncidentCursorAgentHandler(
      {},
      { incidentId: "missing", uid: "admin-1" },
      {
        launchCursorHotfix: async () => ({
          launched: false,
          reason: "not_found",
          code: "CURSOR_HOTFIX_SKIPPED",
        }),
      },
    ),
    (error) => error.message === INCIDENT_NOT_FOUND,
  );
});

test("launchIncidentCursorAgentHandler maps already_launched", async () => {
  await assert.rejects(
    launchIncidentCursorAgentHandler(
      {},
      { incidentId: "inc-1", uid: "admin-1" },
      {
        launchCursorHotfix: async () => ({
          launched: false,
          reason: "already_launched",
          agentId: "bc-existing",
          code: "CURSOR_HOTFIX_SKIPPED",
        }),
      },
    ),
    (error) => error.message === CURSOR_HOTFIX_ALREADY_LAUNCHED,
  );
});

test("launchIncidentCursorAgentHandler maps misconfigured", async () => {
  await assert.rejects(
    launchIncidentCursorAgentHandler(
      {},
      { incidentId: "inc-1", uid: "admin-1" },
      {
        launchCursorHotfix: async () => ({
          launched: false,
          code: CURSOR_HOTFIX_MISCONFIGURED,
        }),
      },
    ),
    (error) => error.message === CURSOR_HOTFIX_MISCONFIGURED,
  );
});
