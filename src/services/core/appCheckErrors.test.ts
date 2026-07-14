import { describe, expect, it } from "vitest";
import { isRecaptchaAlreadyRenderedError } from "./appCheckErrors";

describe("isRecaptchaAlreadyRenderedError", () => {
  it("matches duplicate reCAPTCHA render errors", () => {
    expect(
      isRecaptchaAlreadyRenderedError(
        new Error("reCAPTCHA has already been rendered in this element"),
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isRecaptchaAlreadyRenderedError(new Error("network failed"))).toBe(
      false,
    );
    expect(isRecaptchaAlreadyRenderedError("not an error")).toBe(false);
  });
});
