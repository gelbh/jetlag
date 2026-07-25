import { createHash, randomUUID } from "node:crypto";
import { INCIDENT_NOT_FOUND } from "./postIncidentMessage.mjs";
import { executeSessionOpsTool } from "./sessionOpsExecute.mjs";
import { isSessionOpsToolId } from "./sessionOpsTools.mjs";

export const HOST_CONFIRM_TTL_MS = 5 * 60 * 1000;

export const HOST_CONFIRM_UNAUTHENTICATED = "HOST_CONFIRM_UNAUTHENTICATED";
export const HOST_CONFIRM_NOT_FOUND = "HOST_CONFIRM_NOT_FOUND";
export const HOST_CONFIRM_FORBIDDEN = "HOST_CONFIRM_FORBIDDEN";
export const HOST_CONFIRM_EXPIRED = "HOST_CONFIRM_EXPIRED";
export const HOST_CONFIRM_NOT_PENDING = "HOST_CONFIRM_NOT_PENDING";
export const HOST_CONFIRM_NO_SESSION = "HOST_CONFIRM_NO_SESSION";
export const HOST_CONFIRM_INVALID_TOOL = "HOST_CONFIRM_INVALID_TOOL";
export const HOST_CONFIRM_SESSION_MISMATCH = "HOST_CONFIRM_SESSION_MISMATCH";

/**
 * Stable hash of tool args for confirm docs / audit correlation.
 * @param {unknown} args
 */
export function hashToolArgs(args) {
  return createHash("sha256")
    .update(JSON.stringify(args ?? null))
    .digest("hex");
}

/**
 * @param {string} expiresAtIso
 * @param {() => Date} now
 */
export function isHostConfirmExpired(expiresAtIso, now = () => new Date()) {
  if (typeof expiresAtIso !== "string" || expiresAtIso.length === 0) {
    return true;
  }
  const expiresMs = Date.parse(expiresAtIso);
  if (Number.isNaN(expiresMs)) {
    return true;
  }
  return now().getTime() >= expiresMs;
}

function toolLabel(tool) {
  if (typeof tool !== "string") {
    return "session change";
  }
  return tool.replaceAll("_", " ");
}

/**
 * Create a pending host-confirm doc and notify the session host via FCM.
 *
 * @param db Firestore admin (or compatible mock)
 * @param input { incidentId, sessionId, tool, args, requestedByUid }
 * @param deps { now, generateId, notify, ttlMs }
 */
export async function requestHostConfirm(db, input, deps = {}) {
  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  const sessionId =
    typeof input?.sessionId === "string" ? input.sessionId : "";
  const tool = input?.tool;
  const requestedByUid =
    typeof input?.requestedByUid === "string" ? input.requestedByUid : "";

  if (!incidentId) {
    throw new Error(INCIDENT_NOT_FOUND);
  }
  if (!isSessionOpsToolId(tool)) {
    throw new Error(HOST_CONFIRM_INVALID_TOOL);
  }
  if (!sessionId) {
    throw new Error(HOST_CONFIRM_NO_SESSION);
  }

  const incidentSnap = await db.collection("incidents").doc(incidentId).get();
  if (!incidentSnap.exists) {
    throw new Error(INCIDENT_NOT_FOUND);
  }
  const incident = incidentSnap.data() ?? {};
  const incidentSessionId =
    typeof incident.sessionId === "string" ? incident.sessionId : "";
  if (!incidentSessionId) {
    throw new Error(HOST_CONFIRM_NO_SESSION);
  }
  if (incidentSessionId !== sessionId) {
    throw new Error(HOST_CONFIRM_SESSION_MISMATCH);
  }

  const sessionSnap = await db.collection("sessions").doc(sessionId).get();
  if (!sessionSnap.exists) {
    throw new Error(HOST_CONFIRM_NO_SESSION);
  }
  const session = sessionSnap.data() ?? {};
  const hostUid = typeof session.hostUid === "string" ? session.hostUid : "";
  if (!hostUid) {
    throw new Error(HOST_CONFIRM_NO_SESSION);
  }

  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const ttlMs =
    typeof deps.ttlMs === "number" && deps.ttlMs > 0
      ? deps.ttlMs
      : HOST_CONFIRM_TTL_MS;

  const nowDate = now();
  const nowIso = nowDate.toISOString();
  const expiresAt = new Date(nowDate.getTime() + ttlMs).toISOString();
  const confirmId = generateId();
  const args = input?.args ?? {};
  const argsHash = hashToolArgs(args);

  const confirm = {
    id: confirmId,
    incidentId,
    sessionId,
    tool,
    args,
    argsHash,
    status: "pending",
    hostUid,
    requestedByUid: requestedByUid || null,
    createdAt: nowIso,
    expiresAt,
  };

  await db
    .collection("incidents")
    .doc(incidentId)
    .collection("hostConfirms")
    .doc(confirmId)
    .set(confirm);

  const notify = deps.notify;
  if (typeof notify === "function") {
    await notify({
      sessionId,
      eventType: "incident_host_confirm",
      senderUid: requestedByUid || undefined,
      targetUid: hostUid,
      context: {
        sessionId,
        incidentId,
        confirmId,
        tool,
        expiresAt,
      },
    });
  }

  return {
    confirmId,
    expiresAt,
    hostUid,
    argsHash,
    status: "pending",
  };
}

/**
 * Host-only approve: claim the pending confirm, then execute once with
 * hostConfirmed. Caps are not reset (confirm is orthogonal to summon/turn caps).
 *
 * @param db Firestore admin (or compatible mock)
 * @param input { incidentId, confirmId, uid }
 * @param deps { now, execute, runTransaction? }
 */
export async function approveHostConfirmHandler(db, input, deps = {}) {
  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  const confirmId =
    typeof input?.confirmId === "string" ? input.confirmId : "";
  const uid = typeof input?.uid === "string" ? input.uid : "";

  if (!uid) {
    throw new Error(HOST_CONFIRM_UNAUTHENTICATED);
  }
  if (!incidentId || !confirmId) {
    throw new Error(HOST_CONFIRM_NOT_FOUND);
  }

  const now = deps.now ?? (() => new Date());
  const execute = deps.execute ?? executeSessionOpsTool;
  const confirmRef = db
    .collection("incidents")
    .doc(incidentId)
    .collection("hostConfirms")
    .doc(confirmId);

  const claimed = await claimPendingHostConfirm(db, confirmRef, {
    uid,
    now,
    runTransaction: deps.runTransaction,
  });

  try {
    const result = await execute(
      db,
      {
        incidentId,
        sessionId: claimed.sessionId,
        actorUid: uid,
        tool: claimed.tool,
        args: claimed.args,
        hostConfirmed: true,
      },
      deps.executeDeps,
    );

    const nowIso = now().toISOString();
    await confirmRef.update({
      executedAt: nowIso,
      executeAuditId: result?.auditId ?? null,
      executeStatus: result?.status ?? null,
    });

    return {
      confirmId,
      status: "approved",
      tool: claimed.tool,
      result,
    };
  } catch (error) {
    const nowIso = now().toISOString();
    const message = error instanceof Error ? error.message : "EXECUTE_FAILED";
    await confirmRef.update({
      executeError: message,
      executeFailedAt: nowIso,
    });
    throw error;
  }
}

/**
 * Mark a pending confirm denied (host dismissed). Callable optional; expire
 * still applies if left pending.
 */
export async function denyHostConfirmHandler(db, input, deps = {}) {
  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  const confirmId =
    typeof input?.confirmId === "string" ? input.confirmId : "";
  const uid = typeof input?.uid === "string" ? input.uid : "";

  if (!uid) {
    throw new Error(HOST_CONFIRM_UNAUTHENTICATED);
  }
  if (!incidentId || !confirmId) {
    throw new Error(HOST_CONFIRM_NOT_FOUND);
  }

  const now = deps.now ?? (() => new Date());
  const confirmRef = db
    .collection("incidents")
    .doc(incidentId)
    .collection("hostConfirms")
    .doc(confirmId);

  const snap = await confirmRef.get();
  if (!snap.exists) {
    throw new Error(HOST_CONFIRM_NOT_FOUND);
  }
  const confirm = snap.data() ?? {};
  await assertCallerIsHost(db, confirm, uid);

  if (isHostConfirmExpired(confirm.expiresAt, now)) {
    await confirmRef.update({ status: "expired" });
    throw new Error(HOST_CONFIRM_EXPIRED);
  }
  if (confirm.status !== "pending") {
    throw new Error(HOST_CONFIRM_NOT_PENDING);
  }

  await confirmRef.update({
    status: "denied",
    deniedAt: now().toISOString(),
    deniedByUid: uid,
  });

  return { confirmId, status: "denied" };
}

async function claimPendingHostConfirm(db, confirmRef, { uid, now, runTransaction }) {
  const claim = async (getSnap, update) => {
    const snap = await getSnap();
    if (!snap.exists) {
      throw new Error(HOST_CONFIRM_NOT_FOUND);
    }
    const confirm = snap.data() ?? {};
    await assertCallerIsHost(db, confirm, uid);

    if (isHostConfirmExpired(confirm.expiresAt, now)) {
      await update({ status: "expired" });
      throw new Error(HOST_CONFIRM_EXPIRED);
    }
    if (confirm.status !== "pending") {
      throw new Error(HOST_CONFIRM_NOT_PENDING);
    }

    const sessionId =
      typeof confirm.sessionId === "string" ? confirm.sessionId : "";
    const tool = confirm.tool;
    if (!sessionId || !isSessionOpsToolId(tool)) {
      throw new Error(HOST_CONFIRM_NOT_FOUND);
    }

    await update({
      status: "approved",
      approvedAt: now().toISOString(),
      approvedByUid: uid,
    });

    return {
      sessionId,
      tool,
      args: confirm.args ?? {},
    };
  };

  if (typeof runTransaction === "function") {
    return runTransaction(async (tx) =>
      claim(
        () => tx.get(confirmRef),
        (data) => tx.update(confirmRef, data),
      ),
    );
  }

  // Mock / unit path: read-modify-write without a real transaction.
  return claim(
    () => confirmRef.get(),
    (data) => confirmRef.update(data),
  );
}

async function assertCallerIsHost(db, confirm, uid) {
  const sessionId =
    typeof confirm.sessionId === "string" ? confirm.sessionId : "";
  if (!sessionId) {
    throw new Error(HOST_CONFIRM_NO_SESSION);
  }

  const sessionSnap = await db.collection("sessions").doc(sessionId).get();
  if (!sessionSnap.exists) {
    throw new Error(HOST_CONFIRM_NO_SESSION);
  }
  const session = sessionSnap.data() ?? {};
  const hostUid = typeof session.hostUid === "string" ? session.hostUid : "";
  if (!hostUid || hostUid !== uid) {
    throw new Error(HOST_CONFIRM_FORBIDDEN);
  }
}

/**
 * Human-readable FCM body helper (kept for shared copy / tests).
 */
export function hostConfirmNotificationBody(tool) {
  return `Approve ${toolLabel(tool)}? Open Jet Lag to confirm.`;
}
