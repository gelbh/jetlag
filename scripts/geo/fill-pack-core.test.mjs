import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { KNOWN_PACK_IDS, resolvePackMapping } from "./fill-pack-core.mjs";

const ROOT = "/repo";

describe("resolvePackMapping", () => {
  it("maps switzerland", () => {
    const m = resolvePackMapping("switzerland", ROOT);
    assert.equal(m.bboxKey, "switzerland");
    assert.equal(
      m.ua,
      "JetlagSwissPoiFill/1.0 (https://github.com/gelbh/jetlag; switzerland pack fill)",
    );
    assert.equal(m.poiDir, path.join(ROOT, "public", "geo", "switzerland", "poi"));
    assert.equal(
      m.seaLevelPath,
      path.join(ROOT, "public", "geo", "switzerland", "sea_level_seed.json"),
    );
  });

  it("maps southampton", () => {
    const m = resolvePackMapping("southampton", ROOT);
    assert.equal(m.bboxKey, "southampton");
    assert.equal(
      m.ua,
      "JetlagSouthamptonPoiFill/1.0 (https://github.com/gelbh/jetlag; southampton pack fill)",
    );
    assert.equal(m.poiDir, path.join(ROOT, "public", "geo", "southampton", "poi"));
    assert.equal(
      m.seaLevelPath,
      path.join(ROOT, "public", "geo", "southampton", "sea_level_seed.json"),
    );
  });

  it("maps australia", () => {
    const m = resolvePackMapping("australia", ROOT);
    assert.equal(m.bboxKey, "australia");
    assert.equal(
      m.ua,
      "JetlagAustraliaPoiFill/1.0 (https://github.com/gelbh/jetlag; australia pack fill)",
    );
    assert.equal(m.poiDir, path.join(ROOT, "public", "geo", "australia", "poi"));
    assert.equal(
      m.seaLevelPath,
      path.join(ROOT, "public", "geo", "australia", "sea_level_seed.json"),
    );
  });

  it("throws on unknown pack", () => {
    assert.throws(() => resolvePackMapping("not-a-pack", ROOT), /unknown pack/i);
  });

  it("lists known packs", () => {
    assert.deepEqual([...KNOWN_PACK_IDS].sort(), [
      "amsterdam",
      "australia",
      "berlin",
      "brisbane",
      "brussels",
      "dublin",
      "london",
      "lucerne",
      "nyc",
      "osaka",
      "portland-maine",
      "prince-rupert",
      "singapore",
      "southampton",
      "switzerland",
      "sydney",
      "tokyo",
      "utrecht",
      "wroclaw",
      "zurich",
    ]);
  });
});
