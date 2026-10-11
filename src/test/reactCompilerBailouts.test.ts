import { readFileSync } from "node:fs";
import { transform } from "oxc-transform-react";
import { describe, expect, it } from "vitest";

const compiledFiles = ["../routes/HiderMapScreen.tsx", "../components/friends/FriendsBody.tsx"];

describe("React Compiler coverage", () => {
  it.each(compiledFiles)("%s compiles without bailouts", async (path) => {
    const code = readFileSync(new URL(path, import.meta.url), "utf8");
    const result = await transform(path, code, {
      jsx: { runtime: "automatic" },
      reactCompiler: { panicThreshold: "all_errors" },
      sourcemap: false,
    });
    expect(result.errors.map((error) => error.message)).toEqual([]);
  });
});
