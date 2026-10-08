import { act, renderHook, waitFor } from "@testing-library/react";
import { FirebaseError } from "firebase/app";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeolocationReading } from "@/services/core/location/geolocation";
import {
  allowPlayerLocationPublishes,
  blockPlayerLocationPublishes,
} from "@/services/session/playerLocationPublishGate";
import { useSessionStore } from "@/state/sessionStore";
import { resetTrailPointCacheForTests } from "./appendPlayerTrailPoint";
import { usePlayerLocationPublish } from "./usePlayerLocationPublish";

const { writePlayerLocation, appendPlayerTrailPoint, captureException } = vi.hoisted(() => ({
  writePlayerLocation: vi.fn<(...args: unknown[]) => Promise<void>>(),
  appendPlayerTrailPoint: vi.fn(async () => undefined),
  captureException: vi.fn(),
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock("@/services/firestore/firestoreSessionExtras", () => ({
  writePlayerLocation,
  appendPlayerTrailPoint,
}));

vi.mock("@/services/core/analytics/clientErrors", () => ({ captureException }));

async function flushMicrotasks() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function holdOneReadingOffline() {
  const first = deferred();
  writePlayerLocation.mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
  useSessionStore.setState({ networkReachable: false });
  const view = renderPublisher(readingAt(53.1));
  view.rerender({ reading: readingAt(53.2) });
  expect(writePlayerLocation).toHaveBeenCalledTimes(1);
  return { ...view, first };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function readingAt(lat: number): GeolocationReading {
  return { lat, lng: -6.26, accuracy: 10, heading: null };
}

function renderPublisher(initial: GeolocationReading) {
  return renderHook(
    ({ reading }: { reading: GeolocationReading }) =>
      usePlayerLocationPublish({
        sessionId: "remote-session",
        uid: "user-1",
        enabled: true,
        role: "seeker",
        reading,
      }),
    { initialProps: { reading: initial } },
  );
}

describe("usePlayerLocationPublish", () => {
  beforeEach(() => {
    writePlayerLocation.mockReset();
    appendPlayerTrailPoint.mockClear();
    captureException.mockClear();
    resetTrailPointCacheForTests();
    useSessionStore.setState({ networkReachable: true });
  });

  afterEach(() => {
    useSessionStore.setState({ networkReachable: null });
    allowPlayerLocationPublishes();
  });

  it("keeps only the latest reading while offline with an unacked write", async () => {
    const first = deferred();
    writePlayerLocation.mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    useSessionStore.setState({ networkReachable: false });

    const { rerender } = renderPublisher(readingAt(53.1));
    rerender({ reading: readingAt(53.2) });
    rerender({ reading: readingAt(53.3) });

    expect(writePlayerLocation).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve();
      await first.promise;
    });

    await waitFor(() => expect(writePlayerLocation).toHaveBeenCalledTimes(2));
    expect(writePlayerLocation).toHaveBeenLastCalledWith(
      "remote-session",
      expect.objectContaining({ lat: 53.3, role: "seeker" }),
    );
  });

  it("publishes every reading while online", () => {
    writePlayerLocation.mockReturnValue(new Promise(() => undefined));

    const { rerender } = renderPublisher(readingAt(53.1));
    rerender({ reading: readingAt(53.2) });

    expect(writePlayerLocation).toHaveBeenCalledTimes(2);
  });

  it("samples the trail without waiting for the location ack", () => {
    writePlayerLocation.mockReturnValue(new Promise(() => undefined));

    renderPublisher(readingAt(53.1));

    expect(appendPlayerTrailPoint).toHaveBeenCalledWith(
      "remote-session",
      expect.objectContaining({ uid: "user-1", lat: 53.1 }),
    );
  });

  it("reports non-permission failures without rethrowing", async () => {
    const failure = new Error("boom");
    writePlayerLocation.mockRejectedValue(failure);

    renderPublisher(readingAt(53.1));

    await waitFor(() => expect(captureException).toHaveBeenCalledWith(failure));
  });

  it("ignores permission-denied failures", async () => {
    writePlayerLocation.mockRejectedValue(
      new FirebaseError("permission-denied", "Missing or insufficient permissions."),
    );

    renderPublisher(readingAt(53.1));

    await waitFor(() => expect(writePlayerLocation).toHaveBeenCalled());
    await flushMicrotasks();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("drops the held reading when unmounted before the ack", async () => {
    const { unmount, first } = await holdOneReadingOffline();

    unmount();
    first.resolve();
    await flushMicrotasks();

    expect(writePlayerLocation).toHaveBeenCalledTimes(1);
  });

  it("drops the held reading when publishes are blocked before the ack", async () => {
    const { first } = await holdOneReadingOffline();

    blockPlayerLocationPublishes();
    first.resolve();
    await flushMicrotasks();

    expect(writePlayerLocation).toHaveBeenCalledTimes(1);
  });

  it("flushes the held reading after a non-permission failure", async () => {
    const { first } = await holdOneReadingOffline();

    first.reject(new Error("unavailable"));
    await flushMicrotasks();

    expect(writePlayerLocation).toHaveBeenCalledTimes(2);
    expect(writePlayerLocation).toHaveBeenLastCalledWith(
      "remote-session",
      expect.objectContaining({ lat: 53.2 }),
    );
  });
});
