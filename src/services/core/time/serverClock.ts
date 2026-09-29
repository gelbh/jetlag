import { estimateOffset, type ClockSample } from "@/domain/time/clockOffset";
import { fetchWithTimeout } from "@/services/core/network/fetchWithTimeout";

/** Same-origin Worker route (worker/timeEndpoint.ts); vite dev/preview mirror it. */
const TIME_ENDPOINT_PATH = "/api/time";
const STORAGE_KEY = "jetlag:server-clock-offset";
const MAX_SAMPLES = 8;
const samples: ClockSample[] = [];
let offsetMs = readPersistedOffset();

function readPersistedOffset(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function recordClockSample(sample: ClockSample): void {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
  const next = estimateOffset(samples);
  if (next === null) return;
  offsetMs = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Private mode: in-memory offset still applies this session.
  }
}

/** Device time corrected to server time. Falls back to last persisted offset offline. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function serverNowIso(): string {
  return new Date(serverNow()).toISOString();
}

/** One probe = reachability answer + a clock sample. */
export async function probeServerTime(
  timeoutMs = 5_000,
): Promise<{ ok: boolean }> {
  const sentAtMs = Date.now();
  try {
    const res = await fetchWithTimeout(
      TIME_ENDPOINT_PATH,
      { method: "HEAD", cache: "no-store" },
      timeoutMs,
    );
    const receivedAtMs = Date.now();
    const header = res.headers.get("x-server-time");
    const serverMs = header === null ? Number.NaN : Number(header);
    if (res.ok && Number.isFinite(serverMs)) {
      recordClockSample({ sentAtMs, receivedAtMs, serverMs });
    }
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export function resetServerClockForTests(): void {
  samples.length = 0;
  offsetMs = 0;
}
