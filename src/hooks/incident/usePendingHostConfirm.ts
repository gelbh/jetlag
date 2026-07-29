import { useEffect, useMemo, useState } from "react";
import type { HostConfirmRecord } from "../../domain/incident/incidentTypes";
import { isFirebaseConfigured } from "../../services/core/firebase/firebase";
import { subscribeIncidentHostConfirms } from "../../services/firestore/firestoreIncidents";

function isStillPending(confirm: HostConfirmRecord, nowMs: number): boolean {
  if (confirm.status !== "pending") {
    return false;
  }
  const expiresMs = Date.parse(confirm.expiresAt);
  if (Number.isNaN(expiresMs)) {
    return false;
  }
  return nowMs < expiresMs;
}

/**
 * Newest non-expired pending host confirm for an incident (host modal source).
 */
export function usePendingHostConfirm(
  incidentId: string | null | undefined,
): {
  pending: HostConfirmRecord | null;
  confirms: HostConfirmRecord[];
  error: Error | null;
} {
  const [confirms, setConfirms] = useState<HostConfirmRecord[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [syncedIncidentId, setSyncedIncidentId] = useState(
    incidentId ?? null,
  );

  const normalizedIncidentId = incidentId ?? null;
  if (normalizedIncidentId !== syncedIncidentId) {
    setSyncedIncidentId(normalizedIncidentId);
    setConfirms([]);
    setError(null);
  }

  const subscribed = Boolean(normalizedIncidentId && isFirebaseConfigured());

  useEffect(() => {
    if (!subscribed || !normalizedIncidentId) {
      return;
    }

    const unsub = subscribeIncidentHostConfirms(
      normalizedIncidentId,
      setConfirms,
      (nextError) => {
        setError(nextError);
        setConfirms([]);
      },
    );

    const tick = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15_000);

    return () => {
      unsub();
      window.clearInterval(tick);
    };
  }, [normalizedIncidentId, subscribed]);

  const pending = useMemo(() => {
    for (const confirm of confirms) {
      if (isStillPending(confirm, nowMs)) {
        return confirm;
      }
    }
    return null;
  }, [confirms, nowMs]);

  return { pending, confirms, error };
}
