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

  it("keeps Chat, Settings, and Draw off the hunt island", () => {
    renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const hunt = document.querySelector('[data-island="hunt"]');
    expect(hunt).not.toBeNull();
    const huntLabels = [
      ...(hunt?.querySelectorAll(".jl-tool-slot-label") ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels).not.toContain("Chat");
    expect(huntLabels).not.toContain("Settings");
    expect(huntLabels).not.toContain("Report");
    expect(huntLabels).not.toContain("Draw");
    expect(huntLabels).toContain("Undo");
    expect(huntLabels).toContain("Redo");
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
        name: "Declare found hiding-zone station / start end game",
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
    const stationButton = screen.getByRole("button", {
      name: "Declare found hiding-zone station / start end game",
    });
    expect(stationButton).toBeInTheDocument();
    expect(within(stationButton).getByText("Station")).toBeInTheDocument();
  });

  it("renders short plain labels on every dock slot", () => {
    renderWithRouter(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const labels = [...document.querySelectorAll(".jl-tool-slot-label")].map(
      (node) => node.textContent?.trim() ?? "",
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "Undo",
        "Redo",
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

  it("places Undo and Redo with question tools in hunt and Draw on the session dock", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    renderWithRouter(
      <ToolDock
        {...dockBase}
        canUndo
        canRedo
        onUndo={onUndo}
        onRedo={onRedo}
        onOpenChat={vi.fn()}
      />,
    );

    const bottom = document.querySelector(".jl-map-chrome-bottom-band");
    expect(bottom).not.toBeNull();
    const bandIslands = [
      ...(bottom?.querySelectorAll("[data-island]") ?? []),
    ].map((el) => el.getAttribute("data-island"));
    expect(bandIslands).toEqual(["hunt"]);
    expect(document.querySelector('[data-island="history-start"]')).toBeNull();
    expect(document.querySelector('[data-island="history-end"]')).toBeNull();

    const hunt = document.querySelector('[data-island="hunt"]');
    const undo = within(hunt as HTMLElement).getByRole("button", {
      name: "Undo last annotation",
    });
    const redo = within(hunt as HTMLElement).getByRole("button", {
      name: "Redo last annotation",
    });
    expect(
      within(hunt as HTMLElement).queryByRole("button", { name: "Draw on map" }),
    ).toBeNull();

    const sessionTools = screen.getByLabelText("Session tools");
    expect(
      within(sessionTools).getByRole("button", { name: "Draw on map" }),
    ).toBeInTheDocument();

    const huntLabels = [
      ...(hunt?.querySelectorAll(".jl-tool-slot-label") ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels.slice(0, 2)).toEqual(["Undo", "Redo"]);

    fireEvent.click(undo);
    fireEvent.click(redo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it("disables unavailable and inactive history slots", () => {
    const { rerender } = renderWithRouter(
      <ToolDock {...dockBase} canUndo={false} canRedo={false} />,
    );
    expect(screen.getByRole("button", { name: "Undo last annotation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo last annotation" })).toBeDisabled();

    rerender(
      <ToolDock {...dockBase} canUndo canRedo inactive />,
    );
    expect(screen.getByRole("button", { name: "Undo last annotation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo last annotation" })).toBeDisabled();
  });
});

describe("HiderToolDock", () => {
  it("keeps session tools on the session island without a bottom Recenter chip", () => {
    const onOpenReportProblem = vi.fn();
    renderWithRouter(
      <HiderToolDock
        zoneLabel="Set zone"
        onZoneAction={vi.fn()}
        showExpansion={false}
        onExpansion={vi.fn()}
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
    expect(huntLabels).toEqual(["Set zone"]);
    expect(huntLabels).not.toContain("Chat");
    expect(huntLabels).not.toContain("Report");
    expect(huntLabels).not.toContain("Settings");
    expect(huntLabels).not.toContain("Recenter");

    expect(
      screen.queryByRole("button", { name: "Recenter map on play area" }),
    ).toBeNull();
    expect(document.querySelector('[data-island="map-controls"]')).toBeNull();

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

  it("uses sparse hunt density with full Set zone and Expansion labels", () => {
    renderWithRouter(
      <HiderToolDock
        zoneLabel="Set zone"
        onZoneAction={vi.fn()}
        showExpansion
        onExpansion={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenReportProblem={vi.fn()}
      />,
    );

    const chrome = document.querySelector(".jl-map-bottom-chrome");
    expect(chrome?.getAttribute("data-hunt-density")).toBe("sparse");
    expect(
      document.querySelector(".jl-map-bottom-chrome--hunt-sparse"),
    ).not.toBeNull();

    const hunt = document.querySelector('[data-island="hunt"]');
    expect(hunt?.getAttribute("data-hunt-density")).toBe("sparse");
    const huntLabels = [
      ...(hunt?.querySelectorAll(".jl-tool-slot-label") ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels).toEqual(["Set zone", "Expansion"]);
    expect(screen.getByRole("button", { name: "Set zone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expansion" })).toBeInTheDocument();
  });
});
