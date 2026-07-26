import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  resolveAdminAccess,
  type AdminAccessResolution,
} from "../../domain/admin/adminAccess";
import { usePermanentAuthUser } from "../billing/usePermanentAuthUser";

export type AdminAccessState = "loading" | AdminAccessResolution;

type ResolvedAccess = {
  userKey: string | null;
  value: AdminAccessResolution;
};

export function useAdminAccessState(): {
  state: AdminAccessState;
  user: User | null;
  authReady: boolean;
  isPermanent: boolean;
} {
  const { user, authReady, isPermanent } = usePermanentAuthUser();
  const [resolved, setResolved] = useState<ResolvedAccess | null>(null);
  const generationRef = useRef(0);
  const userKey = user?.uid ?? null;

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const generation = ++generationRef.current;
    const requestUserKey = user?.uid ?? null;

    void resolveAdminAccess(user).then((next) => {
      if (generation !== generationRef.current) {
        return;
      }
      setResolved({ userKey: requestUserKey, value: next });
    });
  }, [authReady, user]);

  const state: AdminAccessState =
    !authReady || resolved == null || resolved.userKey !== userKey
      ? "loading"
      : resolved.value;

  return { state, user, authReady, isPermanent };
}
