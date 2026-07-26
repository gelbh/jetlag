import { describe, expect, it } from "vitest";
import {
  isIdbConnectionClosingMessage,
  isRecaptchaOtTypeErrorMessage,
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
  it("matches Safari Load failed with optional host suffix", () => {
    expect(isWebkitLoadFailedMessage("Load failed")).toBe(true);
    expect(isWebkitLoadFailedMessage("Load failed (jetlag.gelbhart.dev)")).toBe(
      true,
    );
  });

  it("trims whitespace before matching", () => {
    expect(isWebkitLoadFailedMessage("  Load failed  ")).toBe(true);
  });

  it("ignores other messages", () => {
    expect(isWebkitLoadFailedMessage("Failed to fetch")).toBe(false);
    expect(isWebkitLoadFailedMessage("Load failed to fetch")).toBe(false);
  });
});

describe("isRecaptchaOtTypeErrorMessage", () => {
  it("matches Chrome/Safari reCAPTCHA oT property access TypeErrors", () => {
    expect(
      isRecaptchaOtTypeErrorMessage(
        "Cannot read properties of null (reading 'oT')",
      ),
    ).toBe(true);
    expect(
      isRecaptchaOtTypeErrorMessage(
        "null is not an object (evaluating 'a.oT')",
      ),
    ).toBe(true);
  });

  it("ignores unrelated TypeError messages", () => {
    expect(
      isRecaptchaOtTypeErrorMessage("Cannot read properties of null (reading 'x')"),
    ).toBe(false);
    expect(isRecaptchaOtTypeErrorMessage("Load failed")).toBe(false);
  });
});

