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
} {
  const { user, authReady } = usePermanentAuthUser();
  const [resolved, setResolved] = useState<AdminAccessResolution | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const generation = ++generationRef.current;
    setResolved(null);

    void resolveAdminAccess(user).then((next) => {
      if (generation !== generationRef.current) {
        return;
      }
      setResolved(next);
    });
  }, [authReady, user]);

  const state: AdminAccessState =
    !authReady || resolved == null ? "loading" : resolved;

  return { state, user, authReady };
}
