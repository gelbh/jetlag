import { describe, expect, it } from "vitest";
import {
  createMessageId,
  createPendingQuestionId,
} from "./sessionChat";

describe("sessionChat", () => {
  it("creates unique message and pending question ids", () => {
    expect(createMessageId()).not.toBe(createMessageId());
    expect(createPendingQuestionId()).not.toBe(createPendingQuestionId());
    expect(createMessageId()).toMatch(
      /^([0-9a-f-]{36}|msg-\d+-[a-z0-9]+)$/,
    );
  });
});
