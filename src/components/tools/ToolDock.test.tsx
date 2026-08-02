import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolDock } from "./ToolDock";
import { ToolOverflowSheet } from "./ToolOverflowSheet";
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

  it("renders session tools on the secondary bar", () => {
    const onOpenReportProblem = vi.fn();
    const onOpenSettings = vi.fn();
    const onOpenChat = vi.fn();

    renderWithRouter(
      <ToolDock
        {...dockBase}
        onOpenReportProblem={onOpenReportProblem}
        onOpenSettings={onOpenSettings}
        onOpenChat={onOpenChat}
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
      within(sessionTools).getByRole("button", { name: "Open chat" }),
    );

    expect(onOpenReportProblem).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it("keeps Chat and Settings off the primary wide end", () => {
    renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const primary = document.querySelector(
      ".jl-tool-dock-bar:not(.jl-tool-dock-bar--secondary)",
    );
    expect(primary).not.toBeNull();
    const primaryLabels = [
      ...(primary?.querySelectorAll(".jl-tool-slot-label") ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(primaryLabels).not.toContain("Chat");
    expect(primaryLabels).not.toContain("Settings");
    expect(primaryLabels).not.toContain("Report");
    expect(primaryLabels).toContain("Draw");
  });

  it("shows unread badge on secondary chat only when hasUnreadChat is true", () => {
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
    expect(screen.getByRole("button", { name: "More tools" })).toBeInTheDocument();
    expect(document.querySelectorAll(".jl-unread-badge")).toHaveLength(1);
  });

  it("hides unread badge when hasUnreadChat is false", () => {
    renderWithRouter(
      <ToolDock {...dockBase} onOpenChat={vi.fn()} hasUnreadChat={false} />,
    );

    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More tools" })).toBeInTheDocument();
    expect(document.querySelector(".jl-unread-badge")).toBeNull();
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
        "More",
        "Chat",
        "Report",
        "Settings",
      ]),
    );
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
});

describe("HiderToolDock", () => {
  it("keeps Chat and Settings on the secondary bar only", () => {
    const onOpenReportProblem = vi.fn();
    renderWithRouter(
      <HiderToolDock
        zoneLabel="Set zone"
        onZoneAction={vi.fn()}
        showExpansion={false}
        onExpansion={vi.fn()}
        onRecenter={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenReportProblem={onOpenReportProblem}
      />,
    );

    const primary = document.querySelector(
      ".jl-tool-dock-bar:not(.jl-tool-dock-bar--secondary)",
    );
    const primaryLabels = [
      ...(primary?.querySelectorAll(".jl-tool-slot-label") ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(primaryLabels).not.toContain("Chat");
    expect(primaryLabels).not.toContain("Settings");

    fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
    expect(onOpenReportProblem).toHaveBeenCalledTimes(1);
  });
});

describe("ToolOverflowSheet", () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    activeTool: "none" as const,
    onSelect: vi.fn(),
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  };

  it("renders overflow rows without Chat or Settings", () => {
    renderWithRouter(<ToolOverflowSheet {...baseProps} />);

    expect(screen.getByRole("dialog", { name: "More tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pin" })).toBeInTheDocument();
    expect(screen.getByText("Draw a play boundary")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open settings" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open chat" }),
    ).not.toBeInTheDocument();
  });

  it("disables undo when canUndo is false", () => {
    renderWithRouter(<ToolOverflowSheet {...baseProps} canUndo={false} />);

    expect(screen.getByRole("button", { name: "Undo last annotation" })).toBeDisabled();
  });

  it("calls onUndo and closes when undo is enabled", () => {
    const onUndo = vi.fn();
    const onClose = vi.fn();

    renderWithRouter(
      <ToolOverflowSheet
        {...baseProps}
        canUndo
        onUndo={onUndo}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo last annotation" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns null when closed", () => {
    renderWithRouter(<ToolOverflowSheet {...baseProps} open={false} />);

    expect(screen.queryByRole("dialog", { name: "More tools" })).not.toBeInTheDocument();
  });
});
