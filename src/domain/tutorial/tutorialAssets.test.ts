import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectTutorialAssetPaths } from "./tutorialAssets";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PUBLIC_DIR = path.join(ROOT, "public");

describe("tutorialAssets", () => {
  it("references PNG files that exist under public/", () => {
    const missing: string[] = [];

    for (const assetPath of collectTutorialAssetPaths()) {
      const fullPath = path.join(PUBLIC_DIR, assetPath.replace(/^\//, ""));
      if (!fs.existsSync(fullPath)) {
        missing.push(assetPath);
      }
    }

    expect(missing).toEqual([]);
  });
});
