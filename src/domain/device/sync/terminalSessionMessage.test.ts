import { describe, expect, it } from "vitest";
import { isTerminalSessionSyncMessage } from "./terminalSessionMessage";

describe("isTerminalSessionSyncMessage", () => {
  it("returns false for empty messages", () => {
    expect(isTerminalSessionSyncMessage(null)).toBe(false);
    expect(isTerminalSessionSyncMessage("")).toBe(false);
  });

  it("detects missing session copy", () => {
    expect(
      isTerminalSessionSyncMessage("That session no longer exists."),
    ).toBe(true);
  });

  it("detects ended session copy", () => {
    expect(
      isTerminalSessionSyncMessage(
        "That session has ended. Join or create a new one.",
      ),
    ).toBe(true);
  });

  it("ignores retriable sync failures", () => {
    expect(isTerminalSessionSyncMessage("Offline · 2 queued")).toBe(false);
    expect(isTerminalSessionSyncMessage("Sync failed.")).toBe(false);
  });
});
