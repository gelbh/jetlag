import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  resolveAdminAccess,
  type AdminAccessResolution,
} from "../../domain/admin/adminAccess";
import { usePermanentAuthUser } from "../billing/usePermanentAuthUser";

export type AdminAccessState = "loading" | AdminAccessResolution;

export function useAdminAccessState(): {
  state: AdminAccessState;
  user: User | null;
  authReady: boolean;
  isPermanent: boolean;
} {
  const { user, authReady, isPermanent } = usePermanentAuthUser();
  const [resolved, setResolved] = useState<AdminAccessResolution | null>(null);
  const [resolvedUserKey, setResolvedUserKey] = useState<string | null>(null);
  const generationRef = useRef(0);
  const userKey = user?.uid ?? null;

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const generation = ++generationRef.current;
    setResolved(null);
    setResolvedUserKey(null);

    void resolveAdminAccess(user).then((next) => {
      if (generation !== generationRef.current) {
        return;
      }
      setResolved(next);
      setResolvedUserKey(user?.uid ?? null);
    });
  }, [authReady, user]);

  const state: AdminAccessState =
    !authReady ||
    resolved == null ||
    resolvedUserKey !== userKey
      ? "loading"
      : resolved;

  return { state, user, authReady, isPermanent };
}
