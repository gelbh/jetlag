import { fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "@/domain/map/annotations";
import type { SessionActivityEvent } from "@/domain/session/activity/sessionActivityLog";
import { jetlagTheme } from "@/theme/theme";
import { SessionLogBody } from "./SessionLogBody";

function renderUi(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

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
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });
  it("sorts by createdAt oldest-first even when props are shuffled", () => {
    renderUi(
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
      "Session started",
      "Hiding timer started",
      "Seeking started",
    ]);
  });

  it("has no filter controls", () => {
    renderUi(
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
    renderUi(
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
    renderUi(
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

    renderUi(
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
    renderUi(
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

    renderUi(
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
      name: /within range/i,
    });
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("ann-1");
  });

  it("consolidates ask + answer into one selectable plate", () => {
    const onSelect = vi.fn();

    renderUi(
      <SessionLogBody
        events={[
          event({
            id: "ask",
            type: "question_asked",
            createdAt: "2026-07-25T12:00:00.000Z",
            payload: {
              toolType: "radar",
              promptText: "Within range?",
              pendingQuestionId: "pq-1",
            },
          }),
          event({
            id: "answered",
            type: "question_answered",
            createdAt: "2026-07-25T12:01:00.000Z",
            payload: {
              toolType: "radar",
              promptText: "Within range?",
              pendingQuestionId: "pq-1",
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

    expect(screen.getByText("Within range?")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.queryByText(/^asked$/i)).toBeNull();
    expect(screen.queryByText(/^answered$/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /within range/i }));
    expect(onSelect).toHaveBeenCalledWith("ann-1");
  });

  it("hides actions when the linked annotation is no longer active", () => {
    const deleted = annotation("ann-1");
    deleted.status = "deleted";

    const { container } = renderUi(
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
