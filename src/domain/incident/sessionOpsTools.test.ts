import { describe, expect, it } from "vitest";
import {
  getSessionOpsTool,
  isSessionOpsToolId,
  parseSessionOpsToolArgs,
  SESSION_OPS_TOOL_IDS,
  SESSION_OPS_TOOL_JSON_SCHEMAS,
  SESSION_OPS_TOOLS,
} from "./sessionOpsTools";

describe("sessionOpsTools", () => {
  it("exposes a closed allowlist with destructive flags", () => {
    expect(SESSION_OPS_TOOL_IDS).toEqual([
      "soft_reload",
      "reset_board",
      "clear_pending_questions",
      "cancel_pending_question",
      "end_session",
      "soft_delete_annotation",
    ]);
    expect(SESSION_OPS_TOOLS.soft_reload.destructive).toBe(false);
    expect(SESSION_OPS_TOOLS.reset_board.destructive).toBe(true);
    expect(SESSION_OPS_TOOLS.clear_pending_questions.destructive).toBe(true);
    expect(SESSION_OPS_TOOLS.cancel_pending_question.destructive).toBe(true);
    expect(SESSION_OPS_TOOLS.end_session.destructive).toBe(true);
    expect(SESSION_OPS_TOOLS.soft_delete_annotation.destructive).toBe(true);
  });

  it("rejects unknown tool ids", () => {
    expect(isSessionOpsToolId("soft_reload")).toBe(true);
    expect(isSessionOpsToolId("teleport")).toBe(false);
    expect(isSessionOpsToolId(null)).toBe(false);
  });

  it("parses args and rejects extras", () => {
    expect(parseSessionOpsToolArgs("soft_reload", {})).toEqual({});
    expect(
      parseSessionOpsToolArgs("cancel_pending_question", {
        questionId: "q-1",
      }),
    ).toEqual({ questionId: "q-1" });
    expect(() =>
      parseSessionOpsToolArgs("cancel_pending_question", {}),
    ).toThrow();
    expect(() =>
      parseSessionOpsToolArgs("soft_reload", { sessionId: "other" }),
    ).toThrow();
  });

  it("keeps JSON schemas aligned with tool ids", () => {
    for (const id of SESSION_OPS_TOOL_IDS) {
      expect(SESSION_OPS_TOOL_JSON_SCHEMAS[id].type).toBe("object");
      expect(getSessionOpsTool(id).id).toBe(id);
    }
  });

  it("does not allowlist shading override or rematch tools", () => {
    expect(isSessionOpsToolId("invert_annotation_mask")).toBe(false);
    expect(isSessionOpsToolId("set_elimination_override")).toBe(false);
    expect(isSessionOpsToolId("rematch")).toBe(false);
  });
});
