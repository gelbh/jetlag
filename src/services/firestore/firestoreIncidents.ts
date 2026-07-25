import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import {
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
import type { PlayerRole } from "../../domain/session/playerRole";
import { getFirestoreDb, isFirebaseConfigured } from "../core/firebase";

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

  return {
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

/** Admin inbox helper: live list ordered by most recently updated. */
export function subscribeIncidentList(
  onChange: (incidents: IncidentRecord[]) => void,
  onError: (error: Error) => void,
  options: { limitCount?: number } = {},
): Unsubscribe {
  const limitCount = options.limitCount ?? 50;
  return onSnapshot(
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
    (error) => onError(error),
  );
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
