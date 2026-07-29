import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { SessionActivityEvent } from "../../domain/session/activity/sessionActivityLog";
import { useActivityLogStore } from "../../state/activityLogStore";

const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));
const createActivityLogEventIfAbsent = vi.hoisted(() =>
  vi.fn(async () => ({ wrote: true })),
);

vi.mock("../core/firebase/firebase", () => ({
  isFirebaseConfigured,
}));

vi.mock("../firestore/firestoreActivityLog", () => ({
  createActivityLogEventIfAbsent,
}));

import {
  appendRemoteSessionActivityEvent,
  appendSessionActivityEvent,
} from "./sessionActivityLog";

function fixedSessionStarted(
  sessionId: string = LOCAL_SESSION_ID,
): SessionActivityEvent {
  return {
    id: "session_started",
    sessionId,
    type: "session_started",
    createdAt: "2026-07-25T10:00:00.000Z",
    payload: {},
  };
}

describe("appendSessionActivityEvent", () => {
  beforeEach(() => {
    useActivityLogStore.setState({ eventsBySessionId: {} });
    isFirebaseConfigured.mockReturnValue(true);
    createActivityLogEventIfAbsent.mockReset();
    createActivityLogEventIfAbsent.mockResolvedValue({ wrote: true });
  });

  it("writes local store for LOCAL_SESSION_ID and is idempotent for fixed ids", async () => {
    const event = fixedSessionStarted();

    await expect(appendSessionActivityEvent(event)).resolves.toEqual({
      wrote: true,
    });
    await expect(appendSessionActivityEvent(event)).resolves.toEqual({
      wrote: false,
    });

    expect(useActivityLogStore.getState().getEvents(LOCAL_SESSION_ID)).toEqual([
      event,
    ]);
    expect(createActivityLogEventIfAbsent).not.toHaveBeenCalled();
  });

  it("always appends events with distinct random ids locally", async () => {
    const first: SessionActivityEvent = {
      id: "act-1",
      sessionId: LOCAL_SESSION_ID,
      type: "photo_asked",
      createdAt: "2026-07-25T12:00:00.000Z",
      payload: { promptText: "Landmark" },
    };
    const second: SessionActivityEvent = {
      id: "act-2",
      sessionId: LOCAL_SESSION_ID,
      type: "photo_asked",
      createdAt: "2026-07-25T12:01:00.000Z",
      payload: { promptText: "Street sign" },
    };

    await expect(appendSessionActivityEvent(first)).resolves.toEqual({
      wrote: true,
    });
    await expect(appendSessionActivityEvent(second)).resolves.toEqual({
      wrote: true,
    });
    expect(useActivityLogStore.getState().getEvents(LOCAL_SESSION_ID)).toEqual([
      first,
      second,
    ]);
  });

  it("uses local store when Firebase is not configured", async () => {
    isFirebaseConfigured.mockReturnValue(false);
    const event = fixedSessionStarted("remote-session");

    await expect(appendSessionActivityEvent(event)).resolves.toEqual({
      wrote: true,
    });
    expect(useActivityLogStore.getState().getEvents("remote-session")).toEqual([
      event,
    ]);
    expect(createActivityLogEventIfAbsent).not.toHaveBeenCalled();
  });

  it("uses Firestore create-if-absent for remote sessions when Firebase is configured", async () => {
    const event = fixedSessionStarted("remote-session");
    createActivityLogEventIfAbsent.mockResolvedValueOnce({ wrote: false });

    await expect(appendSessionActivityEvent(event)).resolves.toEqual({
      wrote: false,
    });
    expect(createActivityLogEventIfAbsent).toHaveBeenCalledWith(
      "remote-session",
      event,
    );
    expect(useActivityLogStore.getState().getEvents("remote-session")).toEqual(
      [],
    );
  });

  it("exposes remote branch that delegates to Firestore", async () => {
    const event = fixedSessionStarted("remote-session");

    await expect(appendRemoteSessionActivityEvent(event)).resolves.toEqual({
      wrote: true,
    });
    expect(createActivityLogEventIfAbsent).toHaveBeenCalledWith(
      "remote-session",
      event,
    );
  });
});
