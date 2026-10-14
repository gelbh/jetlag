import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminLegStrip } from "./AdminLegStrip";

function question(
  id: string,
  createdAt: string,
  status: PendingQuestionRecord["status"] = "answered",
  toolType: PendingQuestionRecord["toolType"] = "radar",
): PendingQuestionRecord {
  return {
    id,
    sessionId: "s1",
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

function strip(questions: PendingQuestionRecord[]) {
  return (
    <AdminWorld>
      <AdminLegStrip questions={questions} />
    </AdminWorld>
  );
}

function chips() {
  return within(screen.getByRole("list", { name: "Leg strip" })).getAllByRole("listitem");
}

describe("AdminLegStrip", () => {
  it("runs from the start chip through questions in asked order", () => {
    renderWithAppUi(strip([question("b", T(5)), question("a", T(1)), question("c", T(9))]));
    expect(chips().map((chip) => chip.textContent)).toEqual(["S", "1", "2", "3"]);
    expect(screen.getByLabelText("Question 1, radar, answered")).toBeInTheDocument();
  });

  it.each([
    ["answered", "ok", "answered"],
    ["resolved", "ok", "answered"],
    ["pending", "live", "waiting"],
    ["walking", "live", "walking"],
    ["cancelled", "neutral", "cancelled"],
  ] as const)("marks a %s question as %s", (status, tone, word) => {
    renderWithAppUi(strip([question("a", T(1), status, "thermometer")]));
    const chip = screen.getByLabelText(`Question 1, thermometer, ${word}`);
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
    expect(stamped[0]).toHaveTextContent("3");
  });

  it("does not stamp a status change on an existing question", () => {
    const { rerender } = renderWithAppUi(strip([question("a", T(1), "pending")]));
    rerender(strip([question("a", T(1), "answered")]));
    expect(document.querySelectorAll("[data-stamp]")).toHaveLength(0);
  });

  it("moves the latest marker to the newest question", () => {
    const first = [question("a", T(1))];
    const { rerender } = renderWithAppUi(strip(first));
    expect(document.querySelector("[data-latest]")).toHaveTextContent("1");

    rerender(strip([...first, question("b", T(2))]));
    const latest = document.querySelectorAll("[data-latest]");
    expect(latest).toHaveLength(1);
    expect(latest[0]).toHaveTextContent("2");
    expect(latest[0].getAttribute("style")).toContain("2px solid var(--adm-overprint)");
  });

  it("shows only the start chip and a hint before any question", () => {
    renderWithAppUi(strip([]));
    expect(chips()).toHaveLength(1);
    expect(screen.getByText("No questions yet")).toBeInTheDocument();
  });
});
