import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { createGithubRelease } from "./create-github-release.mjs";

describe("createGithubRelease", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("treats GitHub 422 already_exists in errors[] as a skip", async () => {
    const body = JSON.stringify({
      message: "Validation Failed",
      errors: [{ resource: "Release", code: "already_exists", field: "tag_name" }],
    });
    mock.method(globalThis, "fetch", async () =>
      new Response(body, {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await assert.doesNotReject(() =>
      createGithubRelease({
        owner: "gelbh",
        repo: "jetlag",
        tag: "v1.0.2",
        name: "v1.0.2",
        body: "notes",
        token: "test-token",
      }),
    );
  });

  it("throws a readable error for other 422s without double-reading the body", async () => {
    const body = JSON.stringify({
      message: "Validation Failed",
      errors: [{ resource: "Release", code: "invalid", field: "body" }],
    });
    mock.method(globalThis, "fetch", async () =>
      new Response(body, {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await assert.rejects(
      () =>
        createGithubRelease({
          owner: "gelbh",
          repo: "jetlag",
          tag: "v1.0.2",
          name: "v1.0.2",
          body: "notes",
          token: "test-token",
        }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Failed to create GitHub Release v1\.0\.2: 422/);
        assert.match(error.message, /Validation Failed/);
        assert.doesNotMatch(error.message, /Body is unusable/);
        return true;
      },
    );
  });
});
