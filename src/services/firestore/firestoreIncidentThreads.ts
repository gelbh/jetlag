import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "../core/firebase";

/** Thread ids under `incidents/{id}/threads/{threadId}`. */
export type IncidentThreadId = "support" | "hotfix";

export type IncidentThreadMessageSender =
  | "player"
  | "admin"
  | "ops_agent"
  | "system"
  | "hotfix_agent";

export type IncidentThreadMessageKind =
  | "chat"
  | "status"
  | "question"
  | "tool_result"
  | "host_confirm"
  | "agent_meta"
  | "prompt"
  | "mitigation"
  | "agent"
  | "hotfix";

export interface IncidentThreadToolCall {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  status?: string;
  code?: string | null;
  confirmId?: string | null;
}

export interface IncidentThreadMessageRecord {
  id: string;
  incidentId: string;
  threadId: IncidentThreadId;
  sender: IncidentThreadMessageSender;
  senderUid?: string | null;
  createdAt: string;
  text: string;
  kind: IncidentThreadMessageKind;
  visibility?: IncidentThreadId;
  toolCall?: IncidentThreadToolCall | null;
}

const THREAD_SENDERS = new Set<IncidentThreadMessageSender>([
  "player",
  "admin",
  "ops_agent",
  "system",
  "hotfix_agent",
]);

const THREAD_KINDS = new Set<IncidentThreadMessageKind>([
  "chat",
  "status",
  "question",
  "tool_result",
  "host_confirm",
  "agent_meta",
  "prompt",
  "mitigation",
  "agent",
  "hotfix",
]);

function incidentThreadMessagesCollection(
  incidentId: string,
  threadId: IncidentThreadId,
) {
  return collection(
    getFirestoreDb(),
    "incidents",
    incidentId,
    "threads",
    threadId,
    "messages",
  );
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseToolCall(value: unknown): IncidentThreadToolCall | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const toolCall: IncidentThreadToolCall = {};
  if (typeof raw.id === "string") {
    toolCall.id = raw.id;
  }
  if (typeof raw.name === "string") {
    toolCall.name = raw.name;
  }
  if (raw.args && typeof raw.args === "object" && !Array.isArray(raw.args)) {
    toolCall.args = raw.args as Record<string, unknown>;
  }
  if (typeof raw.status === "string") {
    toolCall.status = raw.status;
  }
  if (typeof raw.code === "string" || raw.code === null) {
    toolCall.code = raw.code as string | null;
  }
  if (typeof raw.confirmId === "string" || raw.confirmId === null) {
    toolCall.confirmId = raw.confirmId as string | null;
  }
  return toolCall;
}

export function deserializeIncidentThreadMessageFromFirestore(
  id: string,
  incidentId: string,
  threadId: IncidentThreadId,
  data: Record<string, unknown>,
): IncidentThreadMessageRecord | null {
  const sender = data.sender;
  const kind = data.kind;
  if (
    typeof sender !== "string" ||
    !THREAD_SENDERS.has(sender as IncidentThreadMessageSender) ||
    typeof kind !== "string" ||
    !THREAD_KINDS.has(kind as IncidentThreadMessageKind) ||
    typeof data.text !== "string" ||
    typeof data.createdAt !== "string"
  ) {
    return null;
  }

  const message: IncidentThreadMessageRecord = {
    id,
    incidentId,
    threadId,
    sender: sender as IncidentThreadMessageSender,
    createdAt: data.createdAt,
    text: data.text,
    kind: kind as IncidentThreadMessageKind,
  };

  if ("senderUid" in data) {
    message.senderUid = asNullableString(data.senderUid);
  }
  if (data.visibility === "support" || data.visibility === "hotfix") {
    message.visibility = data.visibility;
  }
  const toolCall = parseToolCall(data.toolCall);
  if (toolCall) {
    message.toolCall = toolCall;
  }
  return message;
}

function subscribeIncidentThreadMessages(
  incidentId: string,
  threadId: IncidentThreadId,
  onChange: (messages: IncidentThreadMessageRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      incidentThreadMessagesCollection(incidentId, threadId),
      orderBy("createdAt", "asc"),
    ),
    (snapshot) => {
      const messages: IncidentThreadMessageRecord[] = [];
      for (const messageDoc of snapshot.docs) {
        const message = deserializeIncidentThreadMessageFromFirestore(
          messageDoc.id,
          incidentId,
          threadId,
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

/** Player/host/member/admin live support thread (session-ops agent chat). */
export function subscribeSupportThreadMessages(
  incidentId: string,
  onChange: (messages: IncidentThreadMessageRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeIncidentThreadMessages(
    incidentId,
    "support",
    onChange,
    onError,
  );
}

/** Admin-only live hotfix thread (coding-agent status / agent_meta). */
export function subscribeHotfixThreadMessages(
  incidentId: string,
  onChange: (messages: IncidentThreadMessageRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeIncidentThreadMessages(
    incidentId,
    "hotfix",
    onChange,
    onError,
  );
}

/** Convenience: thread doc path for admin deep-links / debugging. */
export function incidentThreadDoc(incidentId: string, threadId: IncidentThreadId) {
  return doc(getFirestoreDb(), "incidents", incidentId, "threads", threadId);
}
