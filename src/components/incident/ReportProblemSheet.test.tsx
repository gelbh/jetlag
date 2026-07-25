import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { INCIDENT_NOTE_MAX_LENGTH } from "../../domain/incident/incidentTypes";
import { renderWithRouter } from "../../test/renderWithRouter";
import { ReportProblemSheet } from "./ReportProblemSheet";

vi.mock("../../hooks/incident/useIncidentThread", () => ({
  useIncidentThread: () => ({
    incident: null,
    messages: [],
    error: null,
    sending: false,
    sendMessage: vi.fn(),
  }),
}));

vi.mock("../../hooks/incident/useSupportThread", () => ({
  useSupportThread: () => ({
    incident: null,
    messages: [],
    error: null,
    sending: false,
    summonId: null,
    sendTurn: vi.fn(),
  }),
}));

vi.mock("../../hooks/incident/usePendingHostConfirm", () => ({
  usePendingHostConfirm: () => ({
    pending: null,
    confirms: [],
    error: null,
  }),
}));

describe("ReportProblemSheet", () => {
  it("renders probe copy, diagnostics rows, and 0/140 counter", () => {
    renderWithRouter(
      <ReportProblemSheet open onClose={() => {}} online />,
    );

    expect(
      screen.getByRole("heading", { name: "REPORT PROBLEM" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Help us resolve this quickly. Optional details below."),
    ).toBeInTheDocument();
    expect(screen.getByText("0/140")).toBeInTheDocument();
    expect(screen.getByText("Route")).toBeInTheDocument();
    expect(screen.getByText("App version")).toBeInTheDocument();
    expect(screen.getByText("Last error")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send report" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("caps the note at 140 characters", () => {
    renderWithRouter(
      <ReportProblemSheet open onClose={() => {}} online />,
    );

    const note = screen.getByPlaceholderText("What happened?");
    const oversized = "x".repeat(INCIDENT_NOTE_MAX_LENGTH + 40);
    fireEvent.change(note, { target: { value: oversized } });

    expect((note as HTMLTextAreaElement).value).toHaveLength(
      INCIDENT_NOTE_MAX_LENGTH,
    );
    expect(
      screen.getByText(`${INCIDENT_NOTE_MAX_LENGTH}/140`),
    ).toBeInTheDocument();
  });

  it("disables submit when offline", () => {
    renderWithRouter(
      <ReportProblemSheet open onClose={() => {}} online={false} />,
    );

    expect(
      screen.getByRole("button", { name: "Send report" }),
    ).toBeDisabled();
    expect(
      screen.getByText("You're offline. Reconnect to send a report."),
    ).toBeInTheDocument();
  });

  it("opens fix-agent tab after a successful submit", async () => {
    const createIncidentFn = vi.fn().mockResolvedValue({
      incidentId: "inc-test-1",
      status: "open",
    });

    renderWithRouter(
      <ReportProblemSheet
        open
        onClose={() => {}}
        online
        createIncidentFn={createIncidentFn}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    await waitFor(() => {
      expect(createIncidentFn).toHaveBeenCalled();
    });
    expect(await screen.findByTestId("support-agent-chat")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Fix agent" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("button", { name: "Ask fix agent" }),
    ).toBeInTheDocument();
  });
});
