import { describe, expect, it } from "vitest";
import { formatElapsedTime } from "./timer";

describe("formatElapsedTime", () => {
  it("formats sub-hour durations as mm:ss", () => {
    expect(formatElapsedTime(65_000)).toBe("01:05");
  });

  it("formats hour-long durations as h:mm:ss", () => {
    expect(formatElapsedTime(3_661_000)).toBe("1:01:01");
  });
});
