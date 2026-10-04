import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

    assert.equal(headers.get("Access-Control-Allow-Origin"), "https://jetlag.gelbhart.dev");
    assert.equal(headers.get("Vary"), "Origin");
    assert.match(headers.get("Access-Control-Allow-Headers"), /Authorization/);
  });

  it("defaults to production origin when Origin header is absent", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res);

    assert.equal(headers.get("Access-Control-Allow-Origin"), "https://jetlag.gelbhart.dev");
  });

  it("reflects remapped local Vite origins", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res, {
      headers: { origin: "http://127.0.0.1:5174" },
    });

    assert.equal(headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:5174");
    assert.equal(headers.get("Vary"), "Origin");
  });

  it("reflects Vite origin on the CORS window edge (5200)", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res, {
      headers: { origin: "http://localhost:5200" },
    });

    assert.equal(headers.get("Access-Control-Allow-Origin"), "http://localhost:5200");
  });

  it("ignores local Vite ports above the CORS window (5201)", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res, {
      headers: { origin: "http://127.0.0.1:5201" },
    });

    assert.equal(headers.has("Access-Control-Allow-Origin"), false);
  });

  it("ignores non-Vite local ports", () => {
    const headers = new Map();
    const res = {
      set(name, value) {
        headers.set(name, value);
      },
    };

    setCors(res, {
      headers: { origin: "http://localhost:3000" },
    });

    assert.equal(headers.has("Access-Control-Allow-Origin"), false);
  });
});
