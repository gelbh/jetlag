import { beforeEach, describe, expect, it } from "vitest";
import type { SessionActivityEvent } from "../domain/session/sessionActivityLog";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { useActivityLogStore } from "./activityLogStore";

function sessionStarted(
  overrides: Partial<{
    id: string;
    sessionId: string;
    createdAt: string;
    createdByUid: string;
  }> = {},
): SessionActivityEvent {
  return {
    id: "session_started",
    sessionId: LOCAL_SESSION_ID,
    type: "session_started",
    createdAt: "2026-07-25T10:00:00.000Z",
    payload: {},
    ...overrides,
  };
}

describe("activityLogStore", () => {
  beforeEach(() => {
    useActivityLogStore.setState({ eventsBySessionId: {} });
  });

  it("getEvents returns empty array for unknown session", () => {
    expect(useActivityLogStore.getState().getEvents("missing")).toEqual([]);
  });

  it("appendIfAbsent is idempotent for the same id", () => {
    const event = sessionStarted({
      id: "session_started",
      sessionId: LOCAL_SESSION_ID,
    });

    expect(useActivityLogStore.getState().appendIfAbsent(event)).toBe(true);
    expect(useActivityLogStore.getState().appendIfAbsent(event)).toBe(false);
    expect(useActivityLogStore.getState().getEvents(LOCAL_SESSION_ID)).toHaveLength(
      1,
    );
  });

  it("appendIfAbsent always appends distinct random ids", () => {
    const first: SessionActivityEvent = {
      id: "random-1",
      sessionId: LOCAL_SESSION_ID,
      type: "question_asked",
      createdAt: "2026-07-25T12:00:00.000Z",
      payload: {
        toolType: "radar",
        promptText: "Near water?",
      },
    };
    const second: SessionActivityEvent = {
      id: "random-2",
      sessionId: LOCAL_SESSION_ID,
      type: "question_asked",
      createdAt: "2026-07-25T12:01:00.000Z",
      payload: {
        toolType: "radar",
        promptText: "Near a park?",
      },
    };

    expect(useActivityLogStore.getState().appendIfAbsent(first)).toBe(true);
    expect(useActivityLogStore.getState().appendIfAbsent(second)).toBe(true);
    expect(useActivityLogStore.getState().getEvents(LOCAL_SESSION_ID)).toEqual([
      first,
      second,
    ]);
  });
});
