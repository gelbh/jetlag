import { describe, expect, it } from "vitest";
import { buildMoveTimerIntent } from "./intents";

describe("buildMoveTimerIntent", () => {
  it("builds a move timer intent with only the rules-allowed client keys", () => {
    const intent = buildMoveTimerIntent("hider-1", "pause", 1_700_000_000_123.6);

    expect(intent).toEqual({
      type: "moveTimer",
      action: "pause",
      uid: "hider-1",
      requestedAtMs: 1_700_000_000_124,
    });
    expect(Object.keys(intent).sort()).toEqual(["action", "requestedAtMs", "type", "uid"]);
  });

  it("keeps resume actions", () => {
    expect(buildMoveTimerIntent("hider-1", "resume", 5).action).toBe("resume");
  });
});
