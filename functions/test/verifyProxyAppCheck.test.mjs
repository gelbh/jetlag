import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkProxyAppCheck } from "../proxies/verifyProxyAppCheck.mjs";

function requestWith(headers) {
  return { headers };
}

describe("checkProxyAppCheck", () => {
  it("returns missing without calling the verifier when the header is absent", async () => {
    let calls = 0;
    const verifyToken = async () => {
      calls += 1;
    };
    assert.equal(await checkProxyAppCheck(requestWith({}), { verifyToken }), "missing");
    assert.equal(
      await checkProxyAppCheck(requestWith({ "x-firebase-appcheck": "" }), { verifyToken }),
      "missing",
    );
    assert.equal(calls, 0);
  });

  it("returns invalid when the verifier rejects", async () => {
    const verifyToken = async () => {
      throw new Error("bad token");
    };
    assert.equal(
      await checkProxyAppCheck(requestWith({ "x-firebase-appcheck": "t" }), { verifyToken }),
      "invalid",
    );
  });

  it("returns valid and passes the header token to the verifier", async () => {
    const seen = [];
    const verifyToken = async (token) => {
      seen.push(token);
    };
    assert.equal(
      await checkProxyAppCheck(requestWith({ "x-firebase-appcheck": "tok" }), { verifyToken }),
      "valid",
    );
    assert.deepEqual(seen, ["tok"]);
  });
});
