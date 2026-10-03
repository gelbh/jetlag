import { describe, expect, it } from "vitest";
import { toLocalStorageSeed } from "./adapters/toLocalStorageSeed";
import { formatClearSeedRecipeLines } from "./seedStorage";
import { runWorld } from "./worldCli";

function captureWorld(...argv: string[]) {
  const chunks: string[] = [];
  const errChunks: string[] = [];
  const status = runWorld(argv, {
    stdout: (line: string) => {
      chunks.push(String(line));
    },
    stderr: (line: string) => {
      errChunks.push(String(line));
    },
  });
  return { status, stdout: chunks.join("\n"), stderr: errChunks.join("\n") };
}

describe("world-runner CLI", () => {
  it("list includes dublin-local-map", () => {
    const result = captureWorld("list");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("dublin-local-map");
  });

  it("apply dublin-local-map prints seed matching toLocalStorageSeed", () => {
    const result = captureWorld("apply", "dublin-local-map");
    expect(result.status).toBe(0);
    const seed = JSON.parse(result.stdout) as ReturnType<typeof toLocalStorageSeed>;
    expect(seed).toEqual(toLocalStorageSeed("dublin-local-map"));
  });

  it("apply unknown id exits non-zero", () => {
    const result = captureWorld("apply", "not-a-world");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unknown|not-a-world/i);
  });

  it("reset prints shared seed clear recipe", () => {
    const result = captureWorld("reset");
    expect(result.status).toBe(0);
    for (const line of formatClearSeedRecipeLines()) {
      expect(result.stdout).toContain(line);
    }
    expect(result.stdout).toContain('sessionStorage.removeItem("jetlag-timer")');
    expect(result.stdout).toContain('localStorage.removeItem("jetlag-session")');
  });
});
