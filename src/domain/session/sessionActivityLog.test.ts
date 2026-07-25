import { describe, expect, it } from "vitest";
import {
  FIXED_ACTIVITY_EVENT_IDS,
  activityAnnotationId,
  createActivityEventId,
  phaseActivityEventId,
  sessionActivitySummary,
  sessionActivityTypeLabel,
  sortActivityEventsDesc,
  type SessionActivityEvent,
} from "./sessionActivityLog";

function baseEvent(
  partial: Pick<SessionActivityEvent, "id" | "type" | "createdAt" | "payload">,
): SessionActivityEvent {
  return {
    sessionId: "session-1",
    ...partial,
  } as SessionActivityEvent;
}

describe("sessionActivityLog", () => {
  it("sorts events by createdAt descending from shuffled input", () => {
    const events: SessionActivityEvent[] = [
      baseEvent({
        id: "b",
        type: "seeking_started",
        createdAt: "2026-07-25T12:00:00.000Z",
        payload: {},
      }),
      baseEvent({
        id: "d",
        type: "game_ended",
        createdAt: "2026-07-25T15:00:00.000Z",
        payload: {},
      }),
      baseEvent({
        id: "a",
        type: "session_started",
        createdAt: "2026-07-25T10:00:00.000Z",
        payload: {},
      }),
      baseEvent({
        id: "c",
        type: "hiding_timer_started",
        createdAt: "2026-07-25T11:00:00.000Z",
        payload: {},
      }),
    ];

    expect(sortActivityEventsDesc(events).map((event) => event.id)).toEqual([
      "d",
      "b",
      "c",
      "a",
    ]);
  });

  it("uses fixed ids for phase lifecycle events", () => {
    expect(FIXED_ACTIVITY_EVENT_IDS).toEqual([
      "session_started",
      "hiding_timer_started",
      "seeking_started",
      "game_ended",
    ]);
    expect(phaseActivityEventId("session_started")).toBe("session_started");
    expect(phaseActivityEventId("hiding_timer_started")).toBe(
      "hiding_timer_started",
    );
    expect(phaseActivityEventId("seeking_started")).toBe("seeking_started");
    expect(phaseActivityEventId("game_ended")).toBe("game_ended");
  });

  it("summarizes thermometer walk started, separated, and answered", () => {
    expect(
      sessionActivitySummary(
        baseEvent({
          id: "walk-start",
          type: "thermometer_walk_started",
          createdAt: "2026-07-25T12:00:00.000Z",
          payload: { pendingQuestionId: "pq-1" },
        }),
      ),
    ).toBe("Thermometer walk started");

    expect(
      sessionActivitySummary(
        baseEvent({
          id: "walk-sep",
          type: "thermometer_walk_separated",
          createdAt: "2026-07-25T12:05:00.000Z",
          payload: { pendingQuestionId: "pq-1" },
        }),
      ),
    ).toBe("Thermometer ready — awaiting answer");

    expect(
      sessionActivitySummary(
        baseEvent({
          id: "answered",
          type: "question_answered",
          createdAt: "2026-07-25T12:10:00.000Z",
          payload: {
            toolType: "thermometer",
            promptText: "Hotter or colder?",
            answerSummary: "Hotter",
            annotationId: "ann-1",
          },
        }),
      ),
    ).toBe("Thermometer — Hotter or colder?: Hotter");
  });

  it("creates random activity event ids", () => {
    const id = createActivityEventId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("throws for an unhandled activity type at runtime", () => {
    expect(() =>
      sessionActivitySummary({
        id: "bogus",
        sessionId: "session-1",
        createdAt: "2026-07-25T12:00:00.000Z",
        type: "not_a_real_type",
        payload: {},
      } as SessionActivityEvent),
    ).toThrow(/Unhandled session activity type/);
  });

  it("returns annotationId only for question events that carry one", () => {
    expect(
      activityAnnotationId(
        baseEvent({
          id: "answered",
          type: "question_answered",
          createdAt: "2026-07-25T12:00:00.000Z",
          payload: {
            toolType: "radar",
            promptText: "Near?",
            annotationId: "ann-9",
          },
        }),
      ),
    ).toBe("ann-9");
    expect(
      activityAnnotationId(
        baseEvent({
          id: "session_started",
          type: "session_started",
          createdAt: "2026-07-25T12:00:00.000Z",
          payload: {},
        }),
      ),
    ).toBeUndefined();
  });

  it("labels activity types for the timeline", () => {
    expect(sessionActivityTypeLabel("thermometer_walk_started")).toBe("Walk");
    expect(sessionActivityTypeLabel("question_answered")).toBe("Answered");
  });
});
