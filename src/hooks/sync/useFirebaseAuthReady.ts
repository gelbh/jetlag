import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID, type SessionRecord } from "../domain/annotations";
import { ensureAnonymousUser, isFirebaseConfigured } from "../services/firebase";

function sessionNeedsFirebaseAuth(
  session: SessionRecord | null | undefined,
): boolean {
  return Boolean(
    session &&
      session.id !== LOCAL_SESSION_ID &&
      isFirebaseConfigured(),
  );
}

export function useFirebaseAuthReady(
  session: SessionRecord | null | undefined,
): boolean {
  const needsAuth = sessionNeedsFirebaseAuth(session);
  const sessionKey = session?.id ?? "";
  const [readyBySession, setReadyBySession] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    if (!needsAuth) {
      return;
    }

    let cancelled = false;

    void ensureAnonymousUser()
      .then(() => {
        if (!cancelled) {
          setReadyBySession((current) => ({
            ...current,
            [sessionKey]: true,
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReadyBySession((current) => ({
            ...current,
            [sessionKey]: true,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [needsAuth, sessionKey]);

  if (!needsAuth) {
    return true;
  }

  return readyBySession[sessionKey] === true;
}
