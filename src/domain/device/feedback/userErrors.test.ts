import { describe, expect, it } from "vitest";
import {
  formatUserError,
  userErrorFromSyncMessage,
  userErrorFromTerminalSessionMessage,
} from "./userErrors";

describe("formatUserError", () => {
  it("maps sync offline code", () => {
    expect(formatUserError("sync_offline").title).toBe("Offline");
  });

  it("maps photo upload failures", () => {
    expect(formatUserError("photo_upload", "Denied").message).toBe("Denied");
  });
});

describe("userErrorFromSyncMessage", () => {
  it("returns null for empty messages", () => {
    expect(userErrorFromSyncMessage(null)).toBeNull();
  });

  it("detects offline copy", () => {
    expect(userErrorFromSyncMessage("Offline · 2 queued")?.title).toBe("Offline");
  });
});

describe("userErrorFromTerminalSessionMessage", () => {
  it("offers retry and return to join for missing sessions", () => {
    const error = userErrorFromTerminalSessionMessage(
      "That session no longer exists.",
    );
    expect(error.actionLabel).toBe("Retry");
    expect(error.secondaryActionLabel).toBe("Return to join");
  });
});
