import { describe, expect, it } from "vitest";
import {
  isDatabaseClosedError,
  isDatabaseDeletedError,
  isRetriableDatabaseError,
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

describe("isDatabaseClosedError", () => {
  it("matches Chrome closed-connection InvalidStateError", () => {
    expect(
      isDatabaseClosedError(
        new DOMException(
          "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
          "InvalidStateError",
        ),
      ),
    ).toBe(true);
  });

  it("matches Firefox/WebKit closed database message", () => {
    expect(
      isDatabaseClosedError(
        new DOMException(
          "Can't start a transaction on a closed database",
          "InvalidStateError",
        ),
      ),
    ).toBe(true);
  });

  it("ignores unrelated InvalidStateError", () => {
    expect(
      isDatabaseClosedError(
        new DOMException("An invalid or illegal string was specified", "InvalidStateError"),
      ),
    ).toBe(false);
    expect(isDatabaseClosedError(null)).toBe(false);
  });
});

describe("isRetriableDatabaseError", () => {
  it("covers deleted and closed database errors", () => {
    expect(
      isRetriableDatabaseError(
        new DOMException(
          "Database deleted by request of the user",
          "UnknownError",
        ),
      ),
    ).toBe(true);
    expect(
      isRetriableDatabaseError(
        new DOMException(
          "Can't start a transaction on a closed database",
          "InvalidStateError",
        ),
      ),
    ).toBe(true);
    expect(isRetriableDatabaseError(new Error("Queue read failed"))).toBe(
      false,
    );
  });
});
