import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  isNoticeVisibleToUid,
  type SessionNoticeRecord,
  type SessionNoticeTone,
} from "@/domain/session/opsNotice";
import { dismissSessionNotice } from "@/services/admin/adminSessionNotices";
import { getFirestoreDb, isFirebaseConfigured } from "@/services/core/firebase/firebase";
import { serverNow } from "@/services/core/time/serverClock";

function parseNotice(id: string, data: Record<string, unknown>): SessionNoticeRecord | null {
  if (typeof data.text !== "string" || typeof data.expiresAt !== "string") {
    return null;
  }
  const tone: SessionNoticeTone = data.tone === "warn" ? "warn" : "info";
  const dismissedBy =
    data.dismissedBy && typeof data.dismissedBy === "object" && !Array.isArray(data.dismissedBy)
      ? (data.dismissedBy as Record<string, string>)
      : {};

  return {
    id,
    text: data.text,
    tone,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
    expiresAt: data.expiresAt,
    active: data.active === true,
    dismissedBy,
    supersedesNoticeId:
      typeof data.supersedesNoticeId === "string" ? data.supersedesNoticeId : undefined,
  };
}

export function useSessionNotices(sessionId: string | undefined, uid: string | undefined) {
  const [notices, setNotices] = useState<SessionNoticeRecord[]>([]);
  const [nowMs, setNowMs] = useState(() => serverNow());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(serverNow()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!sessionId || !isFirebaseConfigured()) {
      setNotices([]);
      return;
    }

    const noticesQuery = query(
      collection(getFirestoreDb(), "sessions", sessionId, "notices"),
      where("active", "==", true),
    );

    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const next: SessionNoticeRecord[] = [];
        for (const docSnap of snapshot.docs) {
          const parsed = parseNotice(docSnap.id, docSnap.data() as Record<string, unknown>);
          if (parsed) next.push(parsed);
        }
        next.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        setNotices(next);
      },
      () => {
        setNotices([]);
      },
    );

    return unsubscribe;
  }, [sessionId]);

  const activeNotice = useMemo(() => {
    for (const notice of notices) {
      if (isNoticeVisibleToUid(notice, uid, nowMs)) {
        return notice;
      }
    }
    return null;
  }, [notices, uid, nowMs]);

  const dismiss = async () => {
    if (!sessionId || !uid || !activeNotice) return;
    await dismissSessionNotice(sessionId, activeNotice.id, uid);
  };

  return { activeNotice, dismiss };
}
