import {
  type ClockSample,
  estimateOffset,
  indicatesClockJump,
  isPlausibleOffset,
  sampleOffset,
} from "@/domain/time/clockOffset";
import { fetchWithTimeout } from "@/services/core/network/fetchWithTimeout";

const TIME_ENDPOINT_PATH = "/api/time";
const SERVER_TIME_HEADER = "x-server-time";
const STORAGE_KEY = "jetlag:server-clock-offset";
const MAX_SAMPLES = 8;
const MAX_SAMPLE_AGE_MS = 10 * 60 * 1000;
const MAX_PERSISTED_AGE_MS = 3 * 24 * 60 * 60 * 1000;

type PersistedOffset = { offsetMs: number; savedAtMs: number };

const samples: ClockSample[] = [];
let offsetMs = readPersistedOffset();

function readPersistedOffset(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<PersistedOffset>;
    const { offsetMs: saved, savedAtMs } = parsed;
    if (typeof saved !== "number" || typeof savedAtMs !== "number") return 0;
    const ageMs = Date.now() - savedAtMs;
    if (!isPlausibleOffset(saved) || ageMs < 0 || ageMs > MAX_PERSISTED_AGE_MS) {
      return 0;
    }
    return saved;
  } catch {
    return 0;
  }
}

function persistOffset(next: number): void {
  try {
    const value: PersistedOffset = { offsetMs: next, savedAtMs: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

function pruneSamplesFor(sample: ClockSample): void {
  const hasEstimate = samples.length > 0;
  if (hasEstimate && indicatesClockJump(sample, offsetMs)) {
    samples.length = 0;
    return;
  }
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    const age = sample.receivedAtMs - samples[i].receivedAtMs;
    if (age < 0 || age > MAX_SAMPLE_AGE_MS) samples.splice(i, 1);
  }
}

export function recordClockSample(sample: ClockSample): void {
  if (!isPlausibleOffset(sampleOffset(sample))) return;
  pruneSamplesFor(sample);
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
  const next = estimateOffset(samples);
  if (next === null) return;
  offsetMs = next;
  persistOffset(next);
}

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function serverNowIso(): string {
  return new Date(serverNow()).toISOString();
}

export async function probeServerTime(timeoutMs = 5_000): Promise<{ ok: boolean }> {
  const sentAtMs = Date.now();
  try {
    const res = await fetchWithTimeout(
      TIME_ENDPOINT_PATH,
      { method: "HEAD", cache: "no-store" },
      timeoutMs,
    );
    const receivedAtMs = Date.now();
    const header = res.headers.get(SERVER_TIME_HEADER);
    const serverMs = header === null ? Number.NaN : Number(header);
    if (res.ok && Number.isFinite(serverMs)) {
      recordClockSample({ sentAtMs, receivedAtMs, serverMs });
    }
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** @internal Re-runs cold start (reads persisted offset) with no samples. */
export function resetServerClockForTests(): void {
  samples.length = 0;
  offsetMs = readPersistedOffset();
}
