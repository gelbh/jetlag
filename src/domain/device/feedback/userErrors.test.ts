import { describe, expect, it } from "vitest";
import { formatUserError, userErrorFromSyncMessage } from "./userErrors";

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
