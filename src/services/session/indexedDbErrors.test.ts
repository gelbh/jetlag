import { describe, expect, it } from "vitest";
import { isDatabaseDeletedError } from "./indexedDbErrors";

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
    expect(isDatabaseDeletedError(new Error("Queue read failed"))).toBe(false);
    expect(isDatabaseDeletedError(null)).toBe(false);
  });
});
