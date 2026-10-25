import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInitialRoleSecrets,
  buildRoleGatesForCastleSiegeHost,
  buildRoleGatesForHost,
  countCastleSiegeSeat,
  isCastleSiegeSeatFull,
} from "../session/roleGateShared.mjs";

test("buildInitialRoleSecrets classic seeker mints observer and seeker", () => {
  const secrets = buildInitialRoleSecrets("seeker");
  assert.ok(secrets.observer?.code);
  assert.ok(secrets.seeker?.code);
  assert.equal(secrets.hider, undefined);
  assert.equal(secrets.teamA, undefined);
});

test("buildInitialRoleSecrets classic hider mints observer and hider", () => {
  const secrets = buildInitialRoleSecrets("hider");
  assert.ok(secrets.observer?.code);
  assert.ok(secrets.hider?.code);
  assert.equal(secrets.seeker, undefined);
});

test("buildInitialRoleSecrets classic observer mints observer only", () => {
  const secrets = buildInitialRoleSecrets("observer");
  assert.ok(secrets.observer?.code);
  assert.equal(secrets.seeker, undefined);
  assert.equal(secrets.hider, undefined);
});

test("buildInitialRoleSecrets castleSiege mints four seat secrets", () => {
  const secrets = buildInitialRoleSecrets("observer", { mode: "castleSiege" });
  assert.ok(secrets.teamA?.code);
  assert.ok(secrets.teamB?.code);
  assert.ok(secrets.referee?.code);
  assert.ok(secrets.observer?.code);
  assert.equal(secrets.seeker, undefined);
  assert.equal(secrets.hider, undefined);
});

test("buildRoleGatesForHost classic seeker stamps seeker leader", () => {
  assert.deepEqual(buildRoleGatesForHost("host-1", "seeker"), {
    version: 1,
    leaders: { seeker: "host-1" },
  });
});

test("countCastleSiegeSeat and isCastleSiegeSeatFull enforce capacity", () => {
  const roles = { a: "teamA", b: "teamA", c: "teamB", d: "referee" };
  assert.equal(countCastleSiegeSeat(roles, "teamA"), 2);
  assert.equal(isCastleSiegeSeatFull(roles, "teamA"), false);
  roles.e = "teamA";
  roles.f = "teamA";
  assert.equal(isCastleSiegeSeatFull(roles, "teamA"), true);
  assert.equal(isCastleSiegeSeatFull(roles, "referee"), true);
  assert.equal(isCastleSiegeSeatFull(roles, "observer"), false);
});

test("buildRoleGatesForCastleSiegeHost stamps host playing seat leader", () => {
  assert.deepEqual(buildRoleGatesForCastleSiegeHost("host-1", "teamB"), {
    version: 1,
    leaders: { teamB: "host-1" },
  });
});
