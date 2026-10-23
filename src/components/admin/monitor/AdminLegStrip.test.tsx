import { screen, within } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminLegStrip, LEG_STRIP_SETTLE_MS } from "./AdminLegStrip";

function question(
  id: string,
  createdAt: string,
  status: PendingQuestionRecord["status"] = "answered",
  toolType: PendingQuestionRecord["toolType"] = "radar",
  sessionId = "s1",
): PendingQuestionRecord {
  return {
    id,
    sessionId,
    toolType,
    createdByUid: "seeker",
    createdAt,
    status,
    placement: { geometryJson: "{}", metadata: {} },
    replyOptions: [],
    promptText: `Prompt ${id}`,
  };
}

const T = (minute: number) => `2026-10-14T10:${String(minute).padStart(2, "0")}:00.000Z`;

function strip(questions: PendingQuestionRecord[], sessionId = "s1") {
  return (
    <AdminWorld>
      <AdminLegStrip key={sessionId} sessionId={sessionId} questions={questions} />
    </AdminWorld>
  );
}

function chips() {
  return within(screen.getByRole("list", { name: "Leg strip" })).getAllByRole("listitem");
}

describe("AdminLegStrip", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs from the start chip through questions in asked order", () => {
    renderWithAppUi(strip([question("b", T(5)), question("a", T(1)), question("c", T(9))]));
    expect(chips().map((chip) => chip.textContent)).toEqual([
      "RadarPrompt a · Answered",
      "RadarPrompt b · Answered",
      "RadarPrompt c · Answered",
    ]);
    expect(screen.getByLabelText("Question 1, radar, answered: Prompt a")).toBeInTheDocument();
    expect(screen.getByText("Questions")).toBeInTheDocument();
  });

  it.each([
    ["answered", "ok", "answered"],
    ["resolved", "ok", "answered"],
    ["pending", "live", "waiting"],
    ["walking", "live", "walking"],
    ["cancelled", "neutral", "cancelled"],
  ] as const)("marks a %s question as %s", (status, tone, word) => {
    renderWithAppUi(strip([question("a", T(1), status, "thermometer")]));
    const chip = screen.getByLabelText(`Question 1, thermometer, ${word}: Prompt a`);
    expect(chip).toHaveAttribute("data-tone", tone);
    if (status === "cancelled") {
      expect(chip).toHaveStyle({ textDecoration: "line-through" });
    }
  });

  it("stamps only questions that arrive after mount", () => {
    const first = [question("a", T(1)), question("b", T(2), "pending")];
    const { rerender } = renderWithAppUi(strip(first));
    expect(document.querySelectorAll("[data-stamp]")).toHaveLength(0);

    rerender(strip([...first, question("c", T(3), "pending")]));
    const stamped = document.querySelectorAll("[data-stamp]");
    expect(stamped).toHaveLength(1);
    expect(stamped[0]).toHaveTextContent("Prompt c");
  });

  it("treats a late first snapshot as history, not punches", () => {
    const { rerender } = renderWithAppUi(strip([]));
    rerender(strip([question("a", T(1)), question("b", T(2)), question("c", T(3))]));
    expect(document.querySelectorAll("[data-stamp]")).toHaveLength(0);
  });

  it("does not stamp the next course's history while the last course's questions linger", () => {
    const previous = [question("a", T(1)), question("b", T(2))];
    const { rerender } = renderWithAppUi(strip(previous, "s1"));
    // The question listener still returns the previous course for one render after a switch.
    rerender(strip(previous, "s2"));
    rerender(strip([], "s2"));
    rerender(
      strip(
        [
          question("x", T(1), "answered", "radar", "s2"),
          question("y", T(2), "answered", "radar", "s2"),
        ],
        "s2",
      ),
    );
    expect(document.querySelectorAll("[data-stamp]")).toHaveLength(0);
    expect(chips()).toHaveLength(2);
  });

  it("stamps the first question of a fresh game once the strip has settled", () => {
    vi.useFakeTimers();
    const { rerender } = renderWithAppUi(strip([]));
    act(() => {
      vi.advanceTimersByTime(LEG_STRIP_SETTLE_MS);
    });
    rerender(strip([question("a", T(1), "pending")]));
    expect(document.querySelectorAll("[data-stamp]")).toHaveLength(1);
  });

  it("does not stamp a status change on an existing question", () => {
    const { rerender } = renderWithAppUi(strip([question("a", T(1), "pending")]));
    rerender(strip([question("a", T(1), "answered")]));
    expect(document.querySelectorAll("[data-stamp]")).toHaveLength(0);
  });

  it("moves the latest marker to the newest question", () => {
    const first = [question("a", T(1))];
    const { rerender } = renderWithAppUi(strip(first));
    expect(document.querySelector("[data-latest]")).toHaveTextContent("Prompt a");

    rerender(strip([...first, question("b", T(2))]));
    const latest = document.querySelectorAll("[data-latest]");
    expect(latest).toHaveLength(1);
    expect(latest[0]).toHaveTextContent("Prompt b");
  });

  it("tints answered pills trail-soft and waiting ones signal-soft", () => {
    renderWithAppUi(strip([question("a", T(1)), question("b", T(2), "pending")]));
    const [answered, waiting] = chips();
    expect(answered.getAttribute("style")).toContain("var(--color-trail-soft)");
    expect(waiting.getAttribute("style")).toContain("var(--color-signal-soft)");
  });

  it("shows only a hint before any question", () => {
    renderWithAppUi(strip([]));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText("No questions yet")).toBeInTheDocument();
  });
});
