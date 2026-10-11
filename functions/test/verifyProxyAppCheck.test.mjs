import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProxyHandler } from "../proxies/createProxyHandler.mjs";
import { requireProxyAppCheck } from "../proxies/verifyProxyAppCheck.mjs";

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    set() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send() {
      return this;
    },
  };
}

async function captureWarn(run) {
  const lines = [];
  const originalWarn = console.warn;
  console.warn = (...args) => lines.push(args);
  try {
    return { result: await run(), lines };
  } finally {
    console.warn = originalWarn;
  }
}

describe("requireProxyAppCheck", () => {
  it("passes a valid token silently and hands it to the verifier", async () => {
    const seen = [];
    const { result, lines } = await captureWarn(() =>
      requireProxyAppCheck({ headers: { "x-firebase-appcheck": "tok" } }, fakeRes(), {
        route: "overpass",
        verifyToken: async (token) => seen.push(token),
      }),
    );
    assert.equal(result, true);
    assert.deepEqual(seen, ["tok"]);
    assert.equal(lines.length, 0);
  });

  it("logs a missing token without calling the verifier and continues when log-only", async () => {
    let calls = 0;
    const res = fakeRes();
    const { result, lines } = await captureWarn(() =>
      requireProxyAppCheck({ headers: { "x-firebase-appcheck": "" } }, res, {
        route: "overpass",
        enforce: false,
        verifyToken: async () => {
          calls += 1;
        },
      }),
    );
    assert.equal(result, true);
    assert.equal(calls, 0);
    assert.equal(res.statusCode, null);
    assert.deepEqual(JSON.parse(lines[0][0]), {
      type: "proxy_app_check",
      result: "missing",
      code: null,
      route: "overpass",
      enforced: false,
    });
  });

  it("logs the verifier error code and rejects with 401 when enforced", async () => {
    const res = fakeRes();
    const { result, lines } = await captureWarn(() =>
      requireProxyAppCheck({ headers: { "x-firebase-appcheck": "t" } }, res, {
        route: "overpass",
        enforce: true,
        verifyToken: async () => {
          throw Object.assign(new Error("expired"), { code: "app-check/invalid-argument" });
        },
      }),
    );
    assert.equal(result, false);
    assert.equal(res.statusCode, 401);
    const entry = JSON.parse(lines[0][0]);
    assert.equal(entry.result, "invalid");
    assert.equal(entry.code, "app-check/invalid-argument");
    assert.equal(entry.enforced, true);
  });
});

describe("createProxyHandler app check wiring", () => {
  function handlerWith(requireAppCheck, calls) {
    return createProxyHandler({
      routeName: "overpass",
      requireAppCheck,
      requireAccess: async () => {
        calls.push("access");
        return null;
      },
      handler: async () => {},
    });
  }

  it("runs the app check after method checks and before auth", async () => {
    const calls = [];
    const handler = handlerWith(async (_req, _res, { route }) => {
      calls.push(`appCheck:${route}`);
      return true;
    }, calls);
    await handler({ method: "OPTIONS", headers: {} }, fakeRes());
    await handler({ method: "POST", headers: {} }, fakeRes());
    assert.deepEqual(calls, []);
    await handler({ method: "GET", headers: {} }, fakeRes());
    assert.deepEqual(calls, ["appCheck:overpass", "access"]);
  });

  it("stops before auth when the app check rejects", async () => {
    const calls = [];
    const handler = handlerWith(async () => false, calls);
    await handler({ method: "GET", headers: {} }, fakeRes());
    assert.deepEqual(calls, []);
  });
});
