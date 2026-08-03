import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolDock } from "./ToolDock";
import { HiderToolDock } from "./HiderToolDock";
import { renderWithRouter } from "../../test/renderWithRouter";

const dockBase = {
  activeTool: "none" as const,
  onSelect: vi.fn(),
  canUndo: false,
  canRedo: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenReportProblem: vi.fn(),
  onOpenLog: vi.fn(),
};

describe("ToolDock", () => {
  it("exposes question tools on the dock and markup tools in Draw", () => {
    renderWithRouter(<ToolDock {...dockBase} />);

    expect(screen.getByRole("button", { name: "Matching" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Measuring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pin" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));

    expect(screen.getByRole("menuitem", { name: /Pin/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Zone/i })).toBeInTheDocument();
  });

  it("renders session island tools including Log", () => {
    const onOpenReportProblem = vi.fn();
    const onOpenSettings = vi.fn();
    const onOpenCodes = vi.fn();
    const onOpenChat = vi.fn();
    const onOpenLog = vi.fn();

    renderWithRouter(
      <ToolDock
        {...dockBase}
        onOpenReportProblem={onOpenReportProblem}
        onOpenSettings={onOpenSettings}
        onOpenCodes={onOpenCodes}
        onOpenChat={onOpenChat}
        onOpenLog={onOpenLog}
      />,
    );

    const sessionTools = screen.getByLabelText("Session tools");
    fireEvent.click(
      within(sessionTools).getByRole("button", { name: "Report a problem" }),
    );
    fireEvent.click(
      within(sessionTools).getByRole("button", { name: "Open settings" }),
    );
    fireEvent.click(
      within(sessionTools).getByRole("button", { name: "Open role codes" }),
    );
    fireEvent.click(
      within(sessionTools).getByRole("button", { name: "Open chat" }),
    );
    fireEvent.click(
      within(sessionTools).getByRole("button", { name: "Open session log" }),
    );

    expect(onOpenReportProblem).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onOpenCodes).toHaveBeenCalledTimes(1);
    expect(onOpenChat).toHaveBeenCalledTimes(1);
    expect(onOpenLog).toHaveBeenCalledTimes(1);
  });

  it("omits Codes from session island when onOpenCodes is omitted", () => {
    renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const sessionTools = screen.getByLabelText("Session tools");
    expect(
      within(sessionTools).queryByRole("button", { name: "Open role codes" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Chat and Settings off the hunt island", () => {
    renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const hunt = document.querySelector('[data-island="hunt"]');
    expect(hunt).not.toBeNull();
    const huntLabels = [
      ...(hunt?.querySelectorAll(".jl-tool-slot-label") ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels).not.toContain("Chat");
    expect(huntLabels).not.toContain("Settings");
    expect(huntLabels).not.toContain("Report");
    expect(huntLabels).toContain("Draw");
  });

  it("shows unread badge on session chat only when hasUnreadChat is true", () => {
    renderWithRouter(
      <ToolDock
        {...dockBase}
        onOpenChat={vi.fn()}
        hasUnreadChat
        unreadCount={1}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Open chat, unread messages" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More tools" })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".jl-unread-badge")).toHaveLength(1);
  });

  it("hides unread badge when hasUnreadChat is false", () => {
    renderWithRouter(
      <ToolDock {...dockBase} onOpenChat={vi.fn()} hasUnreadChat={false} />,
    );

    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More tools" })).not.toBeInTheDocument();
    expect(document.querySelector(".jl-unread-badge")).toBeNull();
  });

  it("omits Found and End unless eligible", () => {
    const { rerender } = renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: "Declare found hider" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Start end game — seekers entered the hiding zone",
      }),
    ).not.toBeInTheDocument();

    rerender(
      <ToolDock
        {...dockBase}
        onOpenChat={vi.fn()}
        canRequestFoundHider
        onRequestFoundHider={vi.fn()}
        canStartEndGame
        onStartEndGame={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Declare found hider" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Start end game — seekers entered the hiding zone",
      }),
    ).toBeInTheDocument();
  });

  it("renders short plain labels on every dock slot", () => {
    renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const labels = [...document.querySelectorAll(".jl-tool-slot-label")].map(
      (node) => node.textContent?.trim() ?? "",
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "Match",
        "Measure",
        "Thermo",
        "Radar",
        "Draw",
        "Chat",
        "Log",
        "Report",
        "Settings",
      ]),
    );
    expect(labels).not.toContain("More");
    for (const label of labels) {
      expect(label.length).toBeGreaterThan(0);
      expect(label.endsWith(".")).toBe(false);
    }
  });

  it("applies rail layout class when layout is rail", () => {
    const { container } = renderWithRouter(
      <ToolDock {...dockBase} layout="rail" />,
    );

    expect(container.querySelector(".jl-tool-dock--rail")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Session tools")).toBeInTheDocument();
  });

  it("does not render the dual-row secondary bar", () => {
    renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);
    expect(document.querySelector(".jl-tool-dock-bar--secondary")).toBeNull();
    expect(document.querySelector('[data-island="session"]')).not.toBeNull();
  });
});

describe("HiderToolDock", () => {
  it("puts Recenter on map controls and session tools on the session island", () => {
    const onOpenReportProblem = vi.fn();
    renderWithRouter(
      <HiderToolDock
        zoneLabel="Set zone"
        onZoneAction={vi.fn()}
        showExpansion={false}
        onExpansion={vi.fn()}
        onRecenter={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenReportProblem={onOpenReportProblem}
      />,
    );

    const hunt = document.querySelector('[data-island="hunt"]');
    const huntLabels = [
      ...(hunt?.querySelectorAll(".jl-tool-slot-label") ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels).not.toContain("Chat");
    expect(huntLabels).not.toContain("Report");
    expect(huntLabels).not.toContain("Settings");
    expect(huntLabels).not.toContain("Recenter");

    expect(
      screen.getByRole("button", { name: "Recenter map on play area" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-island="map-controls"]')).not.toBeNull();

    const sessionTools = screen.getByLabelText("Session tools");
    expect(
      within(sessionTools).getByRole("button", { name: "Open chat" }),
    ).toBeInTheDocument();
    expect(
      within(sessionTools).getByRole("button", { name: "Open session log" }),
    ).toBeInTheDocument();
    expect(
      within(sessionTools).getByRole("button", { name: "Open settings" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(sessionTools).getByRole("button", { name: "Report a problem" }),
    );
    expect(onOpenReportProblem).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".jl-tool-dock-bar--secondary")).toBeNull();
  });
});
