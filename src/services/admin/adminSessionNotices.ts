import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  clampNoticeTtlSeconds,
  normalizeNoticeText,
  normalizeNoticeTone,
  type SessionNoticeTone,
} from "@/domain/session/opsNotice";
import {
  getFirebaseFunctions,
  getFirestoreDb,
  isFirebaseConfigured,
} from "../core/firebase/firebase";

interface AdminPublishSessionNoticeRequest {
  sessionId: string;
  text: string;
  tone?: SessionNoticeTone;
  ttlSeconds?: number;
}

interface AdminPublishSessionNoticeResponse {
  ok: true;
  noticeId: string;
  expiresAt: string;
  supersedesNoticeId: string | null;
}

export async function adminPublishSessionNotice(
  sessionId: string,
  input: { text: string; tone?: SessionNoticeTone; ttlSeconds?: number },
): Promise<AdminPublishSessionNoticeResponse> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const text = normalizeNoticeText(input.text);
  if (!text) {
    throw new Error("Notice text is required.");
  }
  const tone = normalizeNoticeTone(input.tone);
  if (!tone) {
    throw new Error("Notice tone must be info or warn.");
  }
  const ttlSeconds = clampNoticeTtlSeconds(input.ttlSeconds);

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    AdminPublishSessionNoticeRequest,
    AdminPublishSessionNoticeResponse
  >(functions, "adminPublishSessionNotice");

  const result = await callable({ sessionId, text, tone, ttlSeconds });
  return result.data;
}

export async function dismissSessionNotice(
  sessionId: string,
  noticeId: string,
  uid: string,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const ref = doc(getFirestoreDb(), "sessions", sessionId, "notices", noticeId);
  await updateDoc(ref, {
    [`dismissedBy.${uid}`]: new Date().toISOString(),
  });
}
