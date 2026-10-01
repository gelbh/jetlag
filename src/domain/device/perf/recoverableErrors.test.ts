import { describe, expect, it } from "vitest";
import {
  countRecoverableError,
  getRecoverableErrorCount,
} from "./recoverableErrors";

describe("recoverableErrors", () => {
  it("counts each recoverable error", () => {
    const before = getRecoverableErrorCount();
    countRecoverableError();
    expect(getRecoverableErrorCount()).toBe(before + 1);
    countRecoverableError();
    expect(getRecoverableErrorCount()).toBe(before + 2);
  });
});
