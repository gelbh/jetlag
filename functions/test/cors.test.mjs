import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setCors } from "../cors.mjs";

describe("cors", () => {
  it("sets permissive cors headers", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res);

    assert.equal(headers.get("Access-Control-Allow-Origin"), "*");
    assert.match(
      headers.get("Access-Control-Allow-Headers"),
      /Authorization/,
    );
  });
});
