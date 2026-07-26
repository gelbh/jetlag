import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import type { SessionActivityEvent } from "../../domain/session/sessionActivityLog";
import { SessionLogBody } from "./SessionLogBody";

function annotation(id: string): AnnotationRecord {
  return {
    id,
    sessionId: "session-1",
    type: "radar",
    status: "active",
    geometry: {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: {},
    },
    metadata: {
      createdAt: "2026-07-25T12:00:00.000Z",
    },
  };
}

function event(
  partial: Pick<SessionActivityEvent, "id" | "type" | "createdAt" | "payload">,
): SessionActivityEvent {
  return {
    sessionId: "session-1",
    ...partial,
  } as SessionActivityEvent;
}

describe("SessionLogBody", () => {
  it("sorts by createdAt newest-first even when props are shuffled", () => {
    render(
      <SessionLogBody
        events={[
          event({
            id: "old",
            type: "session_started",
            createdAt: "2026-07-25T10:00:00.000Z",
            payload: {},
          }),
          event({
            id: "new",
            type: "seeking_started",
            createdAt: "2026-07-25T14:00:00.000Z",
            payload: {},
          }),
          event({
            id: "mid",
            type: "hiding_timer_started",
            createdAt: "2026-07-25T12:00:00.000Z",
            payload: {},
          }),
        ]}
        annotations={[]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        readOnly
      />,
    );

    const summaries = screen.getAllByText(
      /^(Session started|Hiding timer started|Seeking started)$/,
    );
    expect(summaries.map((el) => el.textContent)).toEqual([
      "Seeking started",
      "Hiding timer started",
      "Session started",
    ]);
  });

  it("has no filter controls", () => {
    render(
      <SessionLogBody
        events={[]}
        annotations={[]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /^all$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^radar$/i })).toBeNull();
  });

  it("shows empty copy when there is no activity", () => {
    render(
      <SessionLogBody
        events={[]}
        annotations={[]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("hides Edit/Delete when readOnly", () => {
    render(
      <SessionLogBody
        events={[
          event({
            id: "answered",
            type: "question_answered",
            createdAt: "2026-07-25T13:00:00.000Z",
            payload: {
              toolType: "radar",
              promptText: "Within range?",
              annotationId: "ann-1",
              answerSummary: "Yes",
            },
          }),
        ]}
        annotations={[annotation("ann-1")]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onSelect={vi.fn()}
        readOnly
      />,
    );

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("shows Edit/Delete on annotation-linked rows when editable", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <SessionLogBody
        events={[
          event({
            id: "answered",
            type: "question_answered",
            createdAt: "2026-07-25T13:00:00.000Z",
            payload: {
              toolType: "radar",
              promptText: "Within range?",
              annotationId: "ann-1",
              answerSummary: "Yes",
            },
          }),
        ]}
        annotations={[annotation("ann-1")]}
        onDelete={onDelete}
        onEdit={onEdit}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith("ann-1");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("ann-1");
  });

  it("keeps lifecycle rows read-only (no Edit/Delete)", () => {
    render(
      <SessionLogBody
        events={[
          event({
            id: "session_started",
            type: "session_started",
            createdAt: "2026-07-25T10:00:00.000Z",
            payload: {},
          }),
        ]}
        annotations={[annotation("ann-1")]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("calls onSelect with annotationId when a linked row is clicked", () => {
    const onSelect = vi.fn();

    render(
      <SessionLogBody
        events={[
          event({
            id: "answered",
            type: "question_answered",
            createdAt: "2026-07-25T13:00:00.000Z",
            payload: {
              toolType: "radar",
              promptText: "Within range?",
              annotationId: "ann-1",
              answerSummary: "Yes",
            },
          }),
        ]}
        annotations={[annotation("ann-1")]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onSelect={onSelect}
        readOnly
      />,
    );

    const row = screen.getByRole("button", {
      name: /answered/i,
    });
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("ann-1");
  });

  it("hides actions when the linked annotation is no longer active", () => {
    const deleted = annotation("ann-1");
    deleted.status = "deleted";

    const { container } = render(
      <SessionLogBody
        events={[
          event({
            id: "answered",
            type: "question_answered",
            createdAt: "2026-07-25T13:00:00.000Z",
            payload: {
              toolType: "radar",
              promptText: "Within range?",
              annotationId: "ann-1",
              answerSummary: "Yes",
            },
          }),
        ]}
        annotations={[deleted]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(within(container).queryByRole("button", { name: "Edit" })).toBeNull();
    expect(within(container).queryByRole("button", { name: "Delete" })).toBeNull();
  });
});
