import { describe, expect, it } from "vitest";
import { buildMoveTimerIntent } from "./intents";

describe("buildMoveTimerIntent", () => {
  it.each(["pause", "resume"] as const)(
    "builds a %s intent with only the rules-allowed client keys",
    (action) => {
      const intent = buildMoveTimerIntent("hider-1", action, 1_700_000_000_123.6);

      expect(intent).toEqual({
        type: "moveTimer",
        action,
        uid: "hider-1",
        requestedAtMs: 1_700_000_000_124,
      });
      expect(Object.keys(intent).sort()).toEqual(["action", "requestedAtMs", "type", "uid"]);
    },
  );
});
