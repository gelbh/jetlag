import { describe, expect, it } from "vitest";
import {
  isDatabaseDeletedError,
  isIdbConnectionClosingError,
  isIdbConnectionClosingMessage,
} from "./indexedDbErrors";

describe("isDatabaseDeletedError", () => {
  it("matches Safari storage purge errors", () => {
    expect(
      isDatabaseDeletedError(
        new DOMException(
          "Database deleted by request of the user",
          "UnknownError",
        ),
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(
      isDatabaseDeletedError(
        new Error("Database deleted by request of the user"),
      ),
    ).toBe(true);
    expect(
      isDatabaseDeletedError(
        new DOMException("QuotaExceededError", "QuotaExceededError"),
      ),
    ).toBe(false);
    expect(isDatabaseDeletedError(new Error("Queue read failed"))).toBe(false);
    expect(isDatabaseDeletedError(null)).toBe(false);
  });
});

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

describe("isIdbConnectionClosingError", () => {
  it("matches DOMException and Error instances", () => {
    expect(
      isIdbConnectionClosingError(
        new DOMException(
          "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
          "InvalidStateError",
        ),
      ),
    ).toBe(true);
    expect(
      isIdbConnectionClosingError(
        new Error("The database connection is closing."),
      ),
    ).toBe(true);
  });

  it("ignores unrelated values", () => {
    expect(isIdbConnectionClosingError(new Error("Queue read failed"))).toBe(
      false,
    );
    expect(isIdbConnectionClosingError(null)).toBe(false);
  });
});
