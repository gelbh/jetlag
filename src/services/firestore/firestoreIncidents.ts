import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import {
  type HostConfirmRecord,
  type HostConfirmStatus,
  type IncidentCodingAgentState,
  type IncidentCodingAgentStatus,
  type IncidentDiagnostics,
  type IncidentEmailState,
  type IncidentHotfixState,
  type IncidentMessageKind,
  type IncidentMessageRecord,
  type IncidentMessageSender,
  type IncidentMitigationRecord,
  type IncidentMitigationType,
  type IncidentRecord,
  type IncidentStatus,
  isIncidentStatus,
} from "../../domain/incident/incidentTypes";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { forceRefreshIdToken } from "../core/auth/forceRefreshIdToken";
import { getFirestoreDb, isFirebaseConfigured } from "../core/firebase/firebase";

export const DEFAULT_HOTFIX_GRACE_SECONDS = 30;

export interface AppConfigRuntime {
  requiredMinAppVersion?: string;
  hotfixGraceSeconds?: number;
  updatedAt?: string;
  updatedByUid?: string;
  incidentId?: string;
}

function incidentsCollection() {
  return collection(getFirestoreDb(), "incidents");
}

function incidentDoc(incidentId: string) {
  return doc(getFirestoreDb(), "incidents", incidentId);
}

function incidentMessagesCollection(incidentId: string) {
  return collection(getFirestoreDb(), "incidents", incidentId, "messages");
}

function incidentHostConfirmsCollection(incidentId: string) {
  return collection(getFirestoreDb(), "incidents", incidentId, "hostConfirms");
}

function appConfigRuntimeDoc() {
  return doc(getFirestoreDb(), "appConfig", "runtime");
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parsePlayerRole(value: unknown): PlayerRole | null {
  if (
    value === "seeker" ||
    value === "hider" ||
    value === "observer" ||
    value === "admin"
  ) {
    return value;
  }
  return null;
}

function parseDiagnostics(value: unknown): IncidentDiagnostics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.appVersion !== "string" || typeof raw.route !== "string") {
    return null;
  }
  return raw as unknown as IncidentDiagnostics;
}

function parseEmail(value: unknown): IncidentEmailState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const email: IncidentEmailState = {};
  if (typeof raw.sentAt === "string") {
    email.sentAt = raw.sentAt;
  }
  if (typeof raw.messageId === "string") {
    email.messageId = raw.messageId;
  }
  if (typeof raw.error === "string") {
    email.error = raw.error;
  }
  return email;
}

function isMitigationType(value: string): value is IncidentMitigationType {
  return (
    value === "soft_reload" ||
    value === "reset_board" ||
    value === "clear_pending_questions" ||
    value === "end_session"
  );
}

function parseMitigations(value: unknown): IncidentMitigationRecord[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const mitigations: IncidentMitigationRecord[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const raw = entry as Record<string, unknown>;
    if (
      typeof raw.id !== "string" ||
      typeof raw.type !== "string" ||
      !isMitigationType(raw.type) ||
      typeof raw.appliedAt !== "string" ||
      typeof raw.appliedByUid !== "string"
    ) {
      continue;
    }
    const record: IncidentMitigationRecord = {
      id: raw.id,
      type: raw.type,
      appliedAt: raw.appliedAt,
      appliedByUid: raw.appliedByUid,
    };
    if (typeof raw.note === "string" && raw.note.length > 0) {
      record.note = raw.note;
    }
    mitigations.push(record);
  }
  return mitigations.length > 0 ? mitigations : undefined;
}

function parseHotfix(value: unknown): IncidentHotfixState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.fromVersion !== "string" ||
    typeof raw.toVersion !== "string" ||
    typeof raw.graceSeconds !== "number" ||
    !Number.isFinite(raw.graceSeconds)
  ) {
    return undefined;
  }
  const hotfix: IncidentHotfixState = {
    fromVersion: raw.fromVersion,
    toVersion: raw.toVersion,
    graceSeconds: raw.graceSeconds,
  };
  if (typeof raw.publishedAt === "string") {
    hotfix.publishedAt = raw.publishedAt;
  }
  return hotfix;
}

function isCodingAgentStatus(value: string): value is IncidentCodingAgentStatus {
  return (
    value === "launched" || value === "failed" || value === "misconfigured"
  );
}

function parseCodingAgent(value: unknown): IncidentCodingAgentState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.status !== "string" || !isCodingAgentStatus(raw.status)) {
    return undefined;
  }
  const agent: IncidentCodingAgentState = { status: raw.status };
  if ("cursorAgentId" in raw) {
    agent.cursorAgentId = asNullableString(raw.cursorAgentId);
  }
  if ("cursorAgentUrl" in raw) {
    agent.cursorAgentUrl = asNullableString(raw.cursorAgentUrl);
  }
  if ("cursorRunId" in raw) {
    agent.cursorRunId = asNullableString(raw.cursorRunId);
  }
  if ("error" in raw) {
    agent.error = asNullableString(raw.error);
  }
  if (typeof raw.forced === "boolean") {
    agent.forced = raw.forced;
  }
  if ("forcedByUid" in raw) {
    agent.forcedByUid = asNullableString(raw.forcedByUid);
  }
  if (typeof raw.launchedAt === "string") {
    agent.launchedAt = raw.launchedAt;
  }
  if (typeof raw.updatedAt === "string") {
    agent.updatedAt = raw.updatedAt;
  }
  return agent;
}

export function deserializeIncidentFromFirestore(
  id: string,
  data: Record<string, unknown>,
): IncidentRecord | null {
  const diagnostics = parseDiagnostics(data.diagnostics);
  if (!diagnostics) {
    return null;
  }

  const status: IncidentStatus = isIncidentStatus(data.status)
    ? data.status
    : "open";

  const record: IncidentRecord = {
    id,
    status,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    sessionId: asNullableString(data.sessionId),
    sessionCode: asNullableString(data.sessionCode),
    reporterUid: asNullableString(data.reporterUid),
    reporterRole: parsePlayerRole(data.reporterRole),
    playerNote: asNullableString(data.playerNote),
    diagnostics,
    adminPrompt: typeof data.adminPrompt === "string" ? data.adminPrompt : "",
    email: parseEmail(data.email),
    mitigations: parseMitigations(data.mitigations),
    hotfix: parseHotfix(data.hotfix),
  };
  const agent = parseCodingAgent(data.agent);
  if (agent) {
    record.agent = agent;
  }
  if ("activeSessionOpsSummonId" in data) {
    record.activeSessionOpsSummonId = asNullableString(
      data.activeSessionOpsSummonId,
    );
  }
  if (
    typeof data.sessionOpsSummonCount === "number" &&
    Number.isFinite(data.sessionOpsSummonCount)
  ) {
    record.sessionOpsSummonCount = Math.max(
      0,
      Math.floor(data.sessionOpsSummonCount),
    );
  }
  return record;
}

const MESSAGE_SENDERS = new Set<IncidentMessageSender>([
  "player",
  "admin",
  "system",
]);

const MESSAGE_KINDS = new Set<IncidentMessageKind>([
  "chat",
  "prompt",
  "mitigation",
  "agent",
  "hotfix",
]);

export function deserializeIncidentMessageFromFirestore(
  id: string,
  incidentId: string,
  data: Record<string, unknown>,
): IncidentMessageRecord | null {
  const sender = data.sender;
  const kind = data.kind;
  if (
    typeof sender !== "string" ||
    !MESSAGE_SENDERS.has(sender as IncidentMessageSender) ||
    typeof kind !== "string" ||
    !MESSAGE_KINDS.has(kind as IncidentMessageKind) ||
    typeof data.text !== "string" ||
    typeof data.createdAt !== "string"
  ) {
    return null;
  }

  const message: IncidentMessageRecord = {
    id,
    incidentId,
    sender: sender as IncidentMessageSender,
    createdAt: data.createdAt,
    text: data.text,
    kind: kind as IncidentMessageKind,
  };
  if (typeof data.senderUid === "string" && data.senderUid.length > 0) {
    message.senderUid = data.senderUid;
  }
  return message;
}

export function parseAppConfigRuntime(
  data: Record<string, unknown> | undefined,
): AppConfigRuntime | null {
  if (!data) {
    return null;
  }
  const config: AppConfigRuntime = {};
  if (typeof data.requiredMinAppVersion === "string") {
    config.requiredMinAppVersion = data.requiredMinAppVersion;
  }
  if (
    typeof data.hotfixGraceSeconds === "number" &&
    Number.isFinite(data.hotfixGraceSeconds)
  ) {
    config.hotfixGraceSeconds = data.hotfixGraceSeconds;
  }
  if (typeof data.updatedAt === "string") {
    config.updatedAt = data.updatedAt;
  }
  if (typeof data.updatedByUid === "string") {
    config.updatedByUid = data.updatedByUid;
  }
  if (typeof data.incidentId === "string") {
    config.incidentId = data.incidentId;
  }
  return config;
}

export function subscribeIncident(
  incidentId: string,
  onChange: (incident: IncidentRecord | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    incidentDoc(incidentId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(
        deserializeIncidentFromFirestore(
          snapshot.id,
          snapshot.data() as Record<string, unknown>,
        ),
      );
    },
    (error) => onError(error),
  );
}

export function subscribeIncidentMessages(
  incidentId: string,
  onChange: (messages: IncidentMessageRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(incidentMessagesCollection(incidentId), orderBy("createdAt", "asc")),
    (snapshot) => {
      const messages: IncidentMessageRecord[] = [];
      for (const messageDoc of snapshot.docs) {
        const message = deserializeIncidentMessageFromFirestore(
          messageDoc.id,
          incidentId,
          messageDoc.data() as Record<string, unknown>,
        );
        if (message) {
          messages.push(message);
        }
      }
      onChange(messages);
    },
    (error) => onError(error),
  );
}

const HOST_CONFIRM_STATUSES = new Set<HostConfirmStatus>([
  "pending",
  "approved",
  "denied",
  "expired",
]);

export function deserializeHostConfirmFromFirestore(
  id: string,
  incidentId: string,
  data: Record<string, unknown>,
): HostConfirmRecord | null {
  const status = data.status;
  if (
    typeof status !== "string" ||
    !HOST_CONFIRM_STATUSES.has(status as HostConfirmStatus) ||
    typeof data.sessionId !== "string" ||
    typeof data.tool !== "string" ||
    typeof data.argsHash !== "string" ||
    typeof data.hostUid !== "string" ||
    typeof data.createdAt !== "string" ||
    typeof data.expiresAt !== "string"
  ) {
    return null;
  }

  const args =
    data.args && typeof data.args === "object" && !Array.isArray(data.args)
      ? (data.args as Record<string, unknown>)
      : {};

  const record: HostConfirmRecord = {
    id,
    incidentId,
    sessionId: data.sessionId,
    tool: data.tool,
    args,
    argsHash: data.argsHash,
    status: status as HostConfirmStatus,
    hostUid: data.hostUid,
    requestedByUid: asNullableString(data.requestedByUid),
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };
  if (typeof data.approvedAt === "string") {
    record.approvedAt = data.approvedAt;
  }
  if (typeof data.approvedByUid === "string") {
    record.approvedByUid = data.approvedByUid;
  }
  if (typeof data.deniedAt === "string") {
    record.deniedAt = data.deniedAt;
  }
  if (typeof data.deniedByUid === "string") {
    record.deniedByUid = data.deniedByUid;
  }
  if (typeof data.executedAt === "string") {
    record.executedAt = data.executedAt;
  }
  return record;
}

/** Live host-confirm docs for an incident (host modal / agent status). */
export function subscribeIncidentHostConfirms(
  incidentId: string,
  onChange: (confirms: HostConfirmRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      incidentHostConfirmsCollection(incidentId),
      orderBy("createdAt", "desc"),
    ),
    (snapshot) => {
      const confirms: HostConfirmRecord[] = [];
      for (const confirmDoc of snapshot.docs) {
        const confirm = deserializeHostConfirmFromFirestore(
          confirmDoc.id,
          incidentId,
          confirmDoc.data() as Record<string, unknown>,
        );
        if (confirm) {
          confirms.push(confirm);
        }
      }
      onChange(confirms);
    },
    (error) => onError(error),
  );
}

/** Admin inbox helper: live list ordered by most recently updated. */
export function subscribeIncidentList(
  onChange: (incidents: IncidentRecord[]) => void,
  onError: (error: Error) => void,
  options: { limitCount?: number } = {},
): Unsubscribe {
  const limitCount = options.limitCount ?? 50;
  let unsubscribed = false;
  let activeUnsub: Unsubscribe | null = null;
  let retriedAuth = false;

  const attach = () => {
    activeUnsub = onSnapshot(
      query(
        incidentsCollection(),
        orderBy("updatedAt", "desc"),
        limit(limitCount),
      ),
      (snapshot) => {
        const incidents: IncidentRecord[] = [];
        for (const incidentSnapshot of snapshot.docs) {
          const incident = deserializeIncidentFromFirestore(
            incidentSnapshot.id,
            incidentSnapshot.data() as Record<string, unknown>,
          );
          if (incident) {
            incidents.push(incident);
          }
        }
        onChange(incidents);
      },
      (error) => {
        const permissionDenied =
          error instanceof FirebaseError && error.code === "permission-denied";
        if (!retriedAuth && permissionDenied && !unsubscribed) {
          retriedAuth = true;
          activeUnsub?.();
          activeUnsub = null;
          void forceRefreshIdToken()
            .then(() => {
              if (!unsubscribed) {
                attach();
              }
            })
            .catch((refreshError) => {
              onError(
                refreshError instanceof Error
                  ? refreshError
                  : new Error(String(refreshError)),
              );
            });
          return;
        }
        onError(error);
      },
    );
  };

  attach();

  return () => {
    unsubscribed = true;
    activeUnsub?.();
    activeUnsub = null;
  };
}

export function subscribeAppConfigRuntime(
  onChange: (config: AppConfigRuntime | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onChange(null);
    return () => {};
  }

  return onSnapshot(
    appConfigRuntimeDoc(),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(parseAppConfigRuntime(snapshot.data() as Record<string, unknown>));
    },
    (error) => onError(error),
  );
}
