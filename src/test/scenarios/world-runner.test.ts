import { describe, expect, it } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "../fixtures/dublinGameArea";
import { toLocalStorageSeed } from "./adapters/toLocalStorageSeed";
import { getScenario } from "./catalog";
import { runWorld } from "../../../scripts/world-runner.mjs";

async function captureWorld(...argv: string[]) {
  const chunks: string[] = [];
  const errChunks: string[] = [];
  const status = await runWorld(argv, {
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
  it("list includes dublin-local-map", async () => {
    const result = await captureWorld("list");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("dublin-local-map");
  });

  it("apply dublin-local-map prints seed matching toLocalStorageSeed", async () => {
    const result = await captureWorld("apply", "dublin-local-map");
    expect(result.status).toBe(0);
    const seed = JSON.parse(result.stdout) as {
      sessionBlob: string;
      mapBlob: string;
      annotationsBlob: string;
      clearTimer: boolean;
    };
    const expected = toLocalStorageSeed("dublin-local-map");
    expect(seed).toEqual(expected);

    const parsed = JSON.parse(seed.sessionBlob) as {
      state: { session: { id: string; code: string; gameArea: unknown } };
    };
    const scenario = getScenario("dublin-local-map");
    expect(parsed.state.session.id).toBe(LOCAL_SESSION_ID);
    expect(parsed.state.session.code).toBe(scenario.session.code);
    expect(parsed.state.session.gameArea).toEqual(DUBLIN_CITY_GAME_AREA);
  });

  it("apply unknown id exits non-zero", async () => {
    const result = await captureWorld("apply", "not-a-world");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unknown|not-a-world/i);
  });
});
