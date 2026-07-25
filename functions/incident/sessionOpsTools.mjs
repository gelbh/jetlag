/**
 * Server mirror of src/domain/incident/sessionOpsTools.ts.
 * Keep tool ids, destructive flags, and arg shapes in sync.
 *
 * Inventory (existing mutations → tools):
 * - opsMitigation soft_reload → soft_reload
 * - moderateSession resetBoard / end → reset_board / end_session
 * - cancelOpenPendingQuestions → clear_pending_questions
 * - cancel one pending question → cancel_pending_question
 * - annotation soft-delete (by id) → soft_delete_annotation
 * - resetSessionForRematch → not allowlisted (game-over flow)
 * - shading invert / elimination override → skipped (no session fields)
 */

export const SESSION_OPS_TOOL_IDS = [
  "soft_reload",
  "reset_board",
  "clear_pending_questions",
  "cancel_pending_question",
  "end_session",
  "soft_delete_annotation",
];

const SESSION_OPS_TOOL_ID_SET = new Set(SESSION_OPS_TOOL_IDS);

/** Tools that write via applyIncidentMitigationHandler. */
export const SESSION_OPS_MITIGATION_TOOLS = new Set([
  "soft_reload",
  "reset_board",
  "clear_pending_questions",
  "end_session",
]);

export const SESSION_OPS_TOOLS = {
  soft_reload: {
    id: "soft_reload",
    destructive: false,
    description: "Ask clients in the session to soft-reload via opsMitigation.",
  },
  reset_board: {
    id: "reset_board",
    destructive: true,
    description: "Soft-delete annotations, cancel pending questions, reset timer.",
  },
  clear_pending_questions: {
    id: "clear_pending_questions",
    destructive: true,
    description: "Cancel all open pending questions in the session.",
  },
  cancel_pending_question: {
    id: "cancel_pending_question",
    destructive: true,
    description: "Cancel a single pending question by id.",
  },
  end_session: {
    id: "end_session",
    destructive: true,
    description: "Start the end-game flow for the session.",
  },
  soft_delete_annotation: {
    id: "soft_delete_annotation",
    destructive: true,
    description: "Soft-delete one annotation by id in the session.",
  },
};

/** JSON-schema-ish shapes for LLM tool registration. */
export const SESSION_OPS_TOOL_JSON_SCHEMAS = {
  soft_reload: {
    type: "object",
    additionalProperties: false,
    properties: { note: { type: "string", maxLength: 140 } },
    required: [],
  },
  reset_board: {
    type: "object",
    additionalProperties: false,
    properties: { note: { type: "string", maxLength: 140 } },
    required: [],
  },
  clear_pending_questions: {
    type: "object",
    additionalProperties: false,
    properties: { note: { type: "string", maxLength: 140 } },
    required: [],
  },
  cancel_pending_question: {
    type: "object",
    additionalProperties: false,
    properties: {
      questionId: { type: "string", minLength: 1 },
      note: { type: "string", maxLength: 140 },
    },
    required: ["questionId"],
  },
  end_session: {
    type: "object",
    additionalProperties: false,
    properties: { note: { type: "string", maxLength: 140 } },
    required: [],
  },
  soft_delete_annotation: {
    type: "object",
    additionalProperties: false,
    properties: {
      annotationId: { type: "string", minLength: 1 },
      note: { type: "string", maxLength: 140 },
    },
    required: ["annotationId"],
  },
};

export function isSessionOpsToolId(value) {
  return typeof value === "string" && SESSION_OPS_TOOL_ID_SET.has(value);
}

export function getSessionOpsTool(id) {
  return SESSION_OPS_TOOLS[id] ?? null;
}

function trimNote(note) {
  if (typeof note !== "string") {
    return undefined;
  }
  const trimmed = note.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, 140);
}

function assertNoExtraKeys(args, allowed) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return;
  }
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) {
      throw new Error(`Unexpected argument: ${key}`);
    }
  }
}

/**
 * Parse and coerce tool args. Throws on invalid shapes.
 * Never trusts a model-supplied sessionId (stripped as unexpected).
 */
export function parseSessionOpsToolArgs(toolId, args) {
  const raw = args ?? {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Tool args must be an object");
  }

  switch (toolId) {
    case "soft_reload":
    case "reset_board":
    case "clear_pending_questions":
    case "end_session": {
      assertNoExtraKeys(raw, new Set(["note"]));
      const parsed = {};
      const note = trimNote(raw.note);
      if (note) {
        parsed.note = note;
      }
      return parsed;
    }
    case "cancel_pending_question": {
      assertNoExtraKeys(raw, new Set(["questionId", "note"]));
      if (typeof raw.questionId !== "string" || raw.questionId.length === 0) {
        throw new Error("questionId is required");
      }
      const parsed = { questionId: raw.questionId };
      const note = trimNote(raw.note);
      if (note) {
        parsed.note = note;
      }
      return parsed;
    }
    case "soft_delete_annotation": {
      assertNoExtraKeys(raw, new Set(["annotationId", "note"]));
      if (
        typeof raw.annotationId !== "string" ||
        raw.annotationId.length === 0
      ) {
        throw new Error("annotationId is required");
      }
      const parsed = { annotationId: raw.annotationId };
      const note = trimNote(raw.note);
      if (note) {
        parsed.note = note;
      }
      return parsed;
    }
    default:
      throw new Error(`Unknown tool: ${toolId}`);
  }
}
