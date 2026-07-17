import { describe, expect, it } from "vitest";
import { isWebkitLoadFailedMessage } from "./clientNoiseErrors";

describe("isWebkitLoadFailedMessage", () => {
  it("matches Safari TypeError Load failed", () => {
    expect(isWebkitLoadFailedMessage("TypeError", "Load failed")).toBe(true);
  });

  it("ignores other TypeErrors and non-TypeError Load failed", () => {
    expect(isWebkitLoadFailedMessage("TypeError", "Failed to fetch")).toBe(
      false,
    );
    expect(isWebkitLoadFailedMessage("Error", "Load failed")).toBe(false);
    expect(isWebkitLoadFailedMessage(undefined, "Load failed")).toBe(false);
  });
});
