import { describe, expect, it } from "vitest";
import {
  isIdbConnectionClosingMessage,
  isWebkitLoadFailedMessage,
} from "./clientNoiseErrors";

describe("isIdbConnectionClosingMessage", () => {
  it("matches Firebase Auth closing-connection InvalidStateError text", () => {
    expect(
      isIdbConnectionClosingMessage(
        "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
      ),
    ).toBe(true);
  });

  it("ignores unrelated messages", () => {
    expect(
      isIdbConnectionClosingMessage("Database deleted by request of the user"),
    ).toBe(false);
  });
});

describe("isWebkitLoadFailedMessage", () => {
  it("matches Safari Load failed", () => {
    expect(isWebkitLoadFailedMessage("Load failed")).toBe(true);
  });

  it("trims whitespace before matching", () => {
    expect(isWebkitLoadFailedMessage("  Load failed  ")).toBe(true);
  });

  it("ignores other messages", () => {
    expect(isWebkitLoadFailedMessage("Failed to fetch")).toBe(false);
  });
});
