import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { root } from "./run-command.mjs";

describe("run-command root", () => {
  it("resolves to the repo root", () => {
    assert.ok(existsSync(resolve(root, "package.json")));
    assert.ok(existsSync(resolve(root, "scripts", "lib", "run-command.mjs")));
  });
});
