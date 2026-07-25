import { z } from "zod";

/**
 * Closed allowlist of session-ops agent tools. Server mirrors live in
 * `functions/incident/sessionOpsTools.mjs` — keep ids, destructive flags, and
 * arg shapes in sync.
 *
 * Inventory (existing mutations → tools):
 * - `opsMitigation` soft_reload → `soft_reload`
 * - `moderateSession` resetBoard / end → `reset_board` / `end_session`
 * - `cancelOpenPendingQuestions` → `clear_pending_questions`
 * - cancel one pending question → `cancel_pending_question`
 * - annotation soft-delete (by id) → `soft_delete_annotation`
 * - `resetSessionForRematch` → intentionally not allowlisted (game-over flow)
 * - shading invert / elimination override → skipped (no session fields today;
 *   shading is derived from annotations)
 */

export const SESSION_OPS_TOOL_IDS = [
  "soft_reload",
  "reset_board",
  "clear_pending_questions",
  "cancel_pending_question",
  "end_session",
  "soft_delete_annotation",
] as const;

export type SessionOpsToolId = (typeof SESSION_OPS_TOOL_IDS)[number];

const optionalNoteSchema = z
  .object({
    note: z.string().trim().max(140).optional(),
  })
  .strict();

export const sessionOpsToolArgSchemas = {
  soft_reload: optionalNoteSchema,
  reset_board: optionalNoteSchema,
  clear_pending_questions: optionalNoteSchema,
  cancel_pending_question: z
    .object({
      questionId: z.string().min(1),
      note: z.string().trim().max(140).optional(),
    })
    .strict(),
  end_session: optionalNoteSchema,
  soft_delete_annotation: z
    .object({
      annotationId: z.string().min(1),
      note: z.string().trim().max(140).optional(),
    })
    .strict(),
} as const satisfies Record<SessionOpsToolId, z.ZodType>;

export type SessionOpsToolArgs = {
  [K in SessionOpsToolId]: z.infer<(typeof sessionOpsToolArgSchemas)[K]>;
};

export interface SessionOpsToolDefinition<
  Id extends SessionOpsToolId = SessionOpsToolId,
> {
  id: Id;
  /** When true, executor requires `hostConfirmed` before mutating. */
  destructive: boolean;
  description: string;
  argsSchema: (typeof sessionOpsToolArgSchemas)[Id];
}

export const SESSION_OPS_TOOLS = {
  soft_reload: {
    id: "soft_reload",
    destructive: false,
    description: "Ask clients in the session to soft-reload via opsMitigation.",
    argsSchema: sessionOpsToolArgSchemas.soft_reload,
  },
  reset_board: {
    id: "reset_board",
    destructive: true,
    description: "Soft-delete annotations, cancel pending questions, reset timer.",
    argsSchema: sessionOpsToolArgSchemas.reset_board,
  },
  clear_pending_questions: {
    id: "clear_pending_questions",
    destructive: true,
    description: "Cancel all open pending questions in the session.",
    argsSchema: sessionOpsToolArgSchemas.clear_pending_questions,
  },
  cancel_pending_question: {
    id: "cancel_pending_question",
    destructive: true,
    description: "Cancel a single pending question by id.",
    argsSchema: sessionOpsToolArgSchemas.cancel_pending_question,
  },
  end_session: {
    id: "end_session",
    destructive: true,
    description: "Start the end-game flow for the session.",
    argsSchema: sessionOpsToolArgSchemas.end_session,
  },
  soft_delete_annotation: {
    id: "soft_delete_annotation",
    destructive: true,
    description: "Soft-delete one annotation by id in the session.",
    argsSchema: sessionOpsToolArgSchemas.soft_delete_annotation,
  },
} as const satisfies {
  [K in SessionOpsToolId]: SessionOpsToolDefinition<K>;
};

/** JSON-schema-ish shapes for LLM tool registration (no Zod runtime). */
export const SESSION_OPS_TOOL_JSON_SCHEMAS: Record<
  SessionOpsToolId,
  {
    type: "object";
    additionalProperties: false;
    properties: Record<string, unknown>;
    required: string[];
  }
> = {
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

export function isSessionOpsToolId(value: unknown): value is SessionOpsToolId {
  return (
    typeof value === "string" &&
    (SESSION_OPS_TOOL_IDS as readonly string[]).includes(value)
  );
}

export function getSessionOpsTool(
  id: SessionOpsToolId,
): SessionOpsToolDefinition {
  return SESSION_OPS_TOOLS[id];
}

export function parseSessionOpsToolArgs<Id extends SessionOpsToolId>(
  id: Id,
  args: unknown,
): SessionOpsToolArgs[Id] {
  return sessionOpsToolArgSchemas[id].parse(args ?? {}) as SessionOpsToolArgs[Id];
}
