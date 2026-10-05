import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ANNOTATION_TYPES } from "./annotations";

const ROOT = resolve(import.meta.dirname, "../../..");

function rulesAnnotationTypes(): string[] {
  const rules = readFileSync(resolve(ROOT, "firestore.rules"), "utf8");
  const match = rules.match(
    /function validAnnotationType\(type\)\s*\{\s*return type in \[([^\]]*)\]/,
  );
  if (!match?.[1]) {
    throw new Error("validAnnotationType allowlist not found in firestore.rules");
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]!);
}

describe("annotation types vs firestore.rules", () => {
  // A client type missing here is denied on every remote write (JETLAG-49: freehand "draw").
  it("allowlists exactly the client annotation types", () => {
    expect([...rulesAnnotationTypes()].sort()).toEqual([...ANNOTATION_TYPES].sort());
  });
});
