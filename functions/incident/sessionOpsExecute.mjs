import { randomUUID } from "node:crypto";
import {
  applyIncidentMitigationHandler,
  INCIDENT_NO_SESSION,
} from "./applyIncidentMitigation.mjs";
import { INCIDENT_NOT_FOUND } from "./postIncidentMessage.mjs";
import { SESSION_OPS_MITIGATION_TOOLS } from "./sessionOpsTools.mjs";
import {
  SESSION_OPS_HOST_CONFIRM_REQUIRED,
  SESSION_OPS_INCIDENT_NOT_FOUND,
  SESSION_OPS_INVALID_ARGS,
  SESSION_OPS_NO_SESSION,
  SESSION_OPS_SESSION_MISMATCH,
  SESSION_OPS_UNKNOWN_TOOL,
  validateSessionOpsTool,
} from "./sessionOpsValidate.mjs";

export {
  SESSION_OPS_HOST_CONFIRM_REQUIRED,
  SESSION_OPS_INCIDENT_NOT_FOUND,
  SESSION_OPS_INVALID_ARGS,
  SESSION_OPS_NO_SESSION,
  SESSION_OPS_SESSION_MISMATCH,
  SESSION_OPS_UNKNOWN_TOOL,
};

export const SESSION_OPS_ANNOTATION_NOT_FOUND =
  "SESSION_OPS_ANNOTATION_NOT_FOUND";
export const SESSION_OPS_QUESTION_NOT_FOUND = "SESSION_OPS_QUESTION_NOT_FOUND";

/**
 * Shared executor for desk mitigations and the session-ops agent.
 * Writes an audit row under `incidents/{id}/toolAudit/{id}` for every attempt.
 *
 * @param db Firestore admin (or compatible mock)
 * @param input {
 *   incidentId, sessionId, actorUid, tool, args, hostConfirmed?
 * }
 * @param deps {
 *   now, generateId, moderate, clearPendingQuestions,
 *   cancelPendingQuestion, softDeleteAnnotation, applyMitigation?
 * }
 */
export async function executeSessionOpsTool(db, input, deps = {}) {
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const nowIso = now().toISOString();
  const auditId = generateId();

  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  const sessionId =
    typeof input?.sessionId === "string" ? input.sessionId : "";
  const actorUid = typeof input?.actorUid === "string" ? input.actorUid : "";
  const tool = input?.tool;

  const auditBase = {
    id: auditId,
    createdAt: nowIso,
    actorUid,
    tool: typeof tool === "string" ? tool : null,
    sessionId: sessionId || null,
    args: input?.args ?? null,
    hostConfirmed: input?.hostConfirmed === true,
  };

  async function writeAudit(partial) {
    if (!incidentId) {
      return;
    }
    await db
      .collection("incidents")
      .doc(incidentId)
      .collection("toolAudit")
      .doc(auditId)
      .set({ ...auditBase, ...partial });
  }

  if (!incidentId) {
    await writeAudit({
      status: "rejected",
      code: SESSION_OPS_INCIDENT_NOT_FOUND,
    });
    throw new Error(SESSION_OPS_INCIDENT_NOT_FOUND);
  }

  const incidentSnap = await db.collection("incidents").doc(incidentId).get();
  if (!incidentSnap.exists) {
    await writeAudit({
      status: "rejected",
      code: SESSION_OPS_INCIDENT_NOT_FOUND,
    });
    throw new Error(SESSION_OPS_INCIDENT_NOT_FOUND);
  }

  const incident = incidentSnap.data() ?? {};
  const incidentSessionId =
    typeof incident.sessionId === "string" ? incident.sessionId : "";
  if (!incidentSessionId) {
    await writeAudit({
      status: "rejected",
      code: SESSION_OPS_NO_SESSION,
    });
    throw new Error(SESSION_OPS_NO_SESSION);
  }

  const validation = validateSessionOpsTool({
    tool,
    args: input?.args,
    sessionId,
    incidentSessionId,
    hostConfirmed: input?.hostConfirmed,
  });

  if (!validation.ok) {
    const status = validation.gate ? "gated" : "rejected";
    await writeAudit({
      status,
      code: validation.code,
      message: validation.message,
      args: validation.args ?? input?.args ?? null,
    });

    if (validation.gate) {
      return {
        status: "host_confirm_required",
        code: SESSION_OPS_HOST_CONFIRM_REQUIRED,
        tool: validation.toolId,
        args: validation.args,
        auditId,
      };
    }

    throw new Error(validation.code);
  }

  try {
    const result = await runTool(db, {
      incidentId,
      sessionId,
      actorUid,
      toolId: validation.toolId,
      args: validation.args,
      deps,
    });

    await writeAudit({
      status: "accepted",
      code: null,
      args: validation.args,
      result,
    });

    return {
      status: "ok",
      tool: validation.toolId,
      args: validation.args,
      result,
      auditId,
    };
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SESSION_OPS_EXECUTE_FAILED";
    await writeAudit({
      status: "rejected",
      code,
      args: validation.args,
    });
    throw error;
  }
}

async function runTool(db, { incidentId, sessionId, actorUid, toolId, args, deps }) {
  if (SESSION_OPS_MITIGATION_TOOLS.has(toolId)) {
    const applyMitigation =
      deps.applyMitigation ?? applyIncidentMitigationHandler;
    try {
      return await applyMitigation(
        db,
        {
          incidentId,
          type: toolId,
          uid: actorUid,
          note: args.note,
        },
        {
          now: deps.now,
          generateId: deps.generateId,
          moderate: deps.moderate,
          clearPendingQuestions: deps.clearPendingQuestions,
        },
      );
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      if (error.message === INCIDENT_NOT_FOUND) {
        throw new Error(SESSION_OPS_INCIDENT_NOT_FOUND);
      }
      if (error.message === INCIDENT_NO_SESSION) {
        throw new Error(SESSION_OPS_NO_SESSION);
      }
      throw error;
    }
  }

  if (toolId === "cancel_pending_question") {
    if (typeof deps.cancelPendingQuestion !== "function") {
      throw new Error("cancelPendingQuestion dependency is required");
    }
    await deps.cancelPendingQuestion(sessionId, args.questionId);
    return { questionId: args.questionId, cancelled: true };
  }

  if (toolId === "soft_delete_annotation") {
    if (typeof deps.softDeleteAnnotation !== "function") {
      throw new Error("softDeleteAnnotation dependency is required");
    }
    await deps.softDeleteAnnotation(sessionId, args.annotationId);
    return { annotationId: args.annotationId, deleted: true };
  }

  throw new Error(SESSION_OPS_UNKNOWN_TOOL);
}

/**
 * Default DI helpers for single-doc mutations (admin SDK).
 */
export async function cancelPendingQuestionInSession(db, sessionId, questionId) {
  const ref = db
    .collection("sessions")
    .doc(sessionId)
    .collection("pendingQuestions")
    .doc(questionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(SESSION_OPS_QUESTION_NOT_FOUND);
  }
  await ref.update({ status: "cancelled" });
}

export async function softDeleteAnnotationInSession(
  db,
  sessionId,
  annotationId,
  nowIso,
) {
  const ref = db
    .collection("sessions")
    .doc(sessionId)
    .collection("annotations")
    .doc(annotationId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(SESSION_OPS_ANNOTATION_NOT_FOUND);
  }
  await ref.update({
    status: "deleted",
    updatedAt: nowIso,
  });
}
