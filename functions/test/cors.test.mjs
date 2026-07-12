import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setCors } from "../lib/cors.mjs";

describe("cors", () => {
  it("reflects allowed browser origins", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res, {
      headers: { origin: "https://jetlag.gelbhart.dev" },
    });

    assert.equal(
      headers.get("Access-Control-Allow-Origin"),
      "https://jetlag.gelbhart.dev",
    );
    assert.equal(headers.get("Vary"), "Origin");
    assert.match(
      headers.get("Access-Control-Allow-Headers"),
      /Authorization/,
    );
  });

  it("defaults to production origin when Origin header is absent", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res);

    assert.equal(
      headers.get("Access-Control-Allow-Origin"),
      "https://jetlag.gelbhart.dev",
    );
  });
});
