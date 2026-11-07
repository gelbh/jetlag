/**
 * Player-visible session ops notices.
 * TTL/text/tone clamps must stay mirrored with
 * `functions/admin/publishSessionNotice.mjs` (no shared TS/mjs module yet).
 */
export const SESSION_NOTICE_TEXT_MAX = 280;
export const SESSION_NOTICE_TTL_MIN = 10;
export const SESSION_NOTICE_TTL_MAX = 120;
export const SESSION_NOTICE_TTL_DEFAULT = 30;

export type SessionNoticeTone = "info" | "warn";

export interface SessionNoticeRecord {
  id: string;
  text: string;
  tone: SessionNoticeTone;
  createdAt: string;
  createdByUid: string;
  expiresAt: string;
  active: boolean;
  dismissedBy: Record<string, string>;
  supersedesNoticeId?: string;
}

export interface SessionNoticeDraft {
  text: string;
  tone: SessionNoticeTone;
  ttlSeconds: number;
}

export function clampNoticeTtlSeconds(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return SESSION_NOTICE_TTL_DEFAULT;
  }
  const rounded = Math.round(value);
  return Math.min(SESSION_NOTICE_TTL_MAX, Math.max(SESSION_NOTICE_TTL_MIN, rounded));
}

export function normalizeNoticeText(text: unknown): string | null {
  if (typeof text !== "string") {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > SESSION_NOTICE_TEXT_MAX) {
    return null;
  }
  return trimmed;
}

export function normalizeNoticeTone(tone: unknown): SessionNoticeTone | null {
  if (tone == null || tone === "") {
    return "info";
  }
  if (tone === "info" || tone === "warn") {
    return tone;
  }
  return null;
}

export function isNoticeVisibleToUid(
  notice: SessionNoticeRecord,
  uid: string | undefined,
  nowMs: number,
): boolean {
  if (!notice.active) {
    return false;
  }
  if (Date.parse(notice.expiresAt) <= nowMs) {
    return false;
  }
  if (uid && notice.dismissedBy[uid]) {
    return false;
  }
  return true;
}
