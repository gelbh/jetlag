import { describe, expect, it } from "vitest";
import {
  createGameAreaSwMessage,
  GAME_AREA_SW_MESSAGE_TYPE,
  parseGameAreaSwMessage,
} from "./gameAreaTileMessage";

const BBOX = { south: 51.48, west: -0.15, north: 51.53, east: -0.08 };

describe("parseGameAreaSwMessage", () => {
  it("accepts a bbox message and strips extra fields", () => {
    expect(
      parseGameAreaSwMessage({ type: GAME_AREA_SW_MESSAGE_TYPE, bbox: { ...BBOX, extra: 1 } }),
    ).toEqual({ type: "jetlag:game-area", bbox: BBOX });
  });

  it("accepts an explicit null bbox (session end)", () => {
    expect(parseGameAreaSwMessage(createGameAreaSwMessage(null))).toEqual({
      type: "jetlag:game-area",
      bbox: null,
    });
  });

  it("rejects other message types and malformed payloads", () => {
    expect(parseGameAreaSwMessage({ type: "SKIP_WAITING" })).toBeNull();
    expect(parseGameAreaSwMessage(null)).toBeNull();
    expect(parseGameAreaSwMessage("jetlag:game-area")).toBeNull();
    expect(parseGameAreaSwMessage({ type: GAME_AREA_SW_MESSAGE_TYPE })).toBeNull();
    expect(
      parseGameAreaSwMessage({ type: GAME_AREA_SW_MESSAGE_TYPE, bbox: { ...BBOX, north: 200 } }),
    ).toBeNull();
  });
});
