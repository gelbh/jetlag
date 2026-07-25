import type { SessionRecord } from "../../domain/map/annotations";

function isSessionOpsMitigationType(
  value: string,
): value is NonNullable<SessionRecord["opsMitigation"]>["type"] {
  return (
    value === "soft_reload" ||
    value === "reset_board" ||
    value === "clear_pending_questions" ||
    value === "end_session"
  );
}

/** Parse the server-only session ops mitigation override from Firestore. */
export function parseSessionOpsMitigation(
  value: unknown,
): SessionRecord["opsMitigation"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.type !== "string" ||
    !isSessionOpsMitigationType(raw.type) ||
    typeof raw.appliedAt !== "string" ||
    typeof raw.appliedByUid !== "string" ||
    typeof raw.incidentId !== "string"
  ) {
    return undefined;
  }
  const mitigation: NonNullable<SessionRecord["opsMitigation"]> = {
    id: raw.id,
    type: raw.type,
    appliedAt: raw.appliedAt,
    appliedByUid: raw.appliedByUid,
    incidentId: raw.incidentId,
  };
  if (typeof raw.note === "string" && raw.note.length > 0) {
    mitigation.note = raw.note;
  }
  return mitigation;
}
