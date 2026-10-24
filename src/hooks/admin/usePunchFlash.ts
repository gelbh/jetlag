import { useEffect, useRef, useState } from "react";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";

export const PUNCH_FLASH_MS = 30_000;

type PunchSession = Pick<AdminSessionSummary, "sessionId" | "lastActivityAt">;

const NO_FLASH: ReadonlySet<string> = new Set();

function parseActivity(value: string | null): number | null | undefined {
  if (value === null) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

export function usePunchFlash(sessions: readonly PunchSession[]): ReadonlySet<string> {
  const seenRef = useRef<Map<string, number | null> | null>(null);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [flashing, setFlashing] = useState(NO_FLASH);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const seen = seenRef.current;
    if (!seen) {
      seenRef.current = new Map(
        sessions.map((s) => [s.sessionId, parseActivity(s.lastActivityAt) ?? null]),
      );
      return;
    }

    const punched: string[] = [];
    for (const { sessionId, lastActivityAt } of sessions) {
      const next = parseActivity(lastActivityAt);
      if (next === undefined) continue;
      const known = seen.has(sessionId);
      const previous = seen.get(sessionId);
      seen.set(sessionId, next);
      if (known && next !== null && (previous == null || next > previous)) punched.push(sessionId);
    }
    if (punched.length === 0) return;

    const timers = timersRef.current;
    for (const id of punched) {
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          setFlashing((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }, PUNCH_FLASH_MS),
      );
    }
    setFlashing((current) =>
      punched.every((id) => current.has(id)) ? current : new Set([...current, ...punched]),
    );
  }, [sessions]);

  return flashing;
}
