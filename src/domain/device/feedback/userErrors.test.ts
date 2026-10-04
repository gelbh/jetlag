import { describe, expect, it } from "vitest";
import { NeedsConnectionError } from "@/domain/device/network/needsConnectionError";
import {
  callableErrorMessage,
  formatUserError,
  userErrorFromCallableError,
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
    const error = userErrorFromTerminalSessionMessage("That session no longer exists.");
    expect(error.actionLabel).toBe("Retry");
    expect(error.secondaryActionLabel).toBe("Return to join");
  });
});

describe("userErrorFromCallableError", () => {
  it("maps NeedsConnectionError to No connection with its message", () => {
    const display = userErrorFromCallableError(new NeedsConnectionError());
    expect(display.title).toBe("No connection");
    expect(display.message).toBe("Needs a connection — try again when you have signal.");
    expect(display.action).toBe("retry");
  });

  it("uses the caller fallback for other errors without leaking server text", () => {
    const display = userErrorFromCallableError(
      new Error("INTERNAL tx detail"),
      "Couldn't end the session.",
    );
    expect(display.title).toBe("Something went wrong");
    expect(display.message).toBe("Couldn't end the session.");
  });

  it("callableErrorMessage returns connection copy or the fallback", () => {
    expect(callableErrorMessage(new NeedsConnectionError(), "Nope.")).toMatch(
      /^Needs a connection/,
    );
    expect(callableErrorMessage(new Error("raw"), "Nope.")).toBe("Nope.");
  });
});
