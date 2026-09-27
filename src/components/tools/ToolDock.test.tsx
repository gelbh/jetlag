import { fireEvent, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { ToolDock } from "./ToolDock";
import { HiderToolDock } from "./HiderToolDock";
import { renderWithRouter } from "../../test/renderWithRouter";

const DOCK_LABEL = "[data-ios-tool-label]";

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

beforeEach(() => {
  dockBase.onSelect.mockClear();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

function wrapDock(ui: React.ReactElement) {
  return (
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>
  );
}

function renderDock(ui: React.ReactElement) {
  return renderWithRouter(wrapDock(ui));
}

describe("ToolDock", () => {
  it("exposes question tools on the dock and markup tools in Draw", async () => {
    renderDock(<ToolDock {...dockBase} />);

    expect(screen.getByRole("button", { name: "Matching" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Measuring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pin" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));

    expect(
      await screen.findByRole("menuitemradio", { name: /Pin/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Zone/i })).toBeInTheDocument();
  });

  it("renders session island tools including Log", () => {
    const onOpenReportProblem = vi.fn();
    const onOpenSettings = vi.fn();
    const onOpenCodes = vi.fn();
    const onOpenChat = vi.fn();
    const onOpenLog = vi.fn();

    renderDock(
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
    renderDock(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const sessionTools = screen.getByLabelText("Session tools");
    expect(
      within(sessionTools).queryByRole("button", { name: "Open role codes" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Chat, Settings, and Draw off the hunt island", () => {
    renderDock(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const hunt = document.querySelector('[data-island="hunt"]');
    expect(hunt).not.toBeNull();
    const huntLabels = [
      ...(hunt?.querySelectorAll(DOCK_LABEL) ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels).not.toContain("Chat");
    expect(huntLabels).not.toContain("Settings");
    expect(huntLabels).not.toContain("Report");
    expect(huntLabels).not.toContain("Draw");
    expect(huntLabels).toContain("Undo");
    expect(huntLabels).toContain("Redo");
  });

  it("shows unread badge on session chat only when hasUnreadChat is true", () => {
    renderDock(
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
    renderDock(
      <ToolDock {...dockBase} onOpenChat={vi.fn()} hasUnreadChat={false} />,
    );

    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More tools" })).not.toBeInTheDocument();
    expect(document.querySelector(".jl-unread-badge")).toBeNull();
  });

  it("omits Found and End unless eligible", () => {
    const { rerender } = renderDock(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: "Declare found hider" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Declare found hiding-zone station / start end game",
      }),
    ).not.toBeInTheDocument();

    rerender(
      wrapDock(
        <ToolDock
          {...dockBase}
          onOpenChat={vi.fn()}
          canRequestFoundHider
          onRequestFoundHider={vi.fn()}
          canStartEndGame
          onStartEndGame={vi.fn()}
        />,
      ),
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
    renderDock(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);

    const labels = [...document.querySelectorAll(DOCK_LABEL)].map(
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
    const { container } = renderDock(
      <ToolDock {...dockBase} layout="rail" />,
    );

    expect(container.querySelector(".jl-tool-dock--rail")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Session tools")).toBeInTheDocument();
  });

  it("does not render the dual-row secondary bar", () => {
    renderDock(<ToolDock {...dockBase} onOpenChat={vi.fn()} />);
    expect(document.querySelector(".jl-tool-dock-bar--secondary")).toBeNull();
    expect(document.querySelector('[data-island="session"]')).not.toBeNull();
  });

  it("places Undo and Redo with question tools in hunt and Draw on the session dock", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    renderDock(
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
      ...(hunt?.querySelectorAll(DOCK_LABEL) ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels.slice(0, 2)).toEqual(["Undo", "Redo"]);

    fireEvent.click(undo);
    fireEvent.click(redo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it("disables unavailable and inactive history slots", () => {
    const { rerender } = renderDock(
      <ToolDock {...dockBase} canUndo={false} canRedo={false} />,
    );
    expect(screen.getByRole("button", { name: "Undo last annotation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo last annotation" })).toBeDisabled();

    rerender(
      wrapDock(<ToolDock {...dockBase} canUndo canRedo inactive />),
    );
    expect(screen.getByRole("button", { name: "Undo last annotation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo last annotation" })).toBeDisabled();
  });

  it("selects question tools and shows hunt highlight", () => {
    const onSelect = vi.fn();
    const { rerender } = renderDock(
      <ToolDock {...dockBase} onSelect={onSelect} onOpenChat={vi.fn()} />,
    );

    const matching = screen.getByRole("button", { name: "Matching" });
    fireEvent.click(matching);
    expect(onSelect).toHaveBeenCalledWith("matching");

    rerender(
      wrapDock(
        <ToolDock
          {...dockBase}
          activeTool="matching"
          onSelect={onSelect}
          onOpenChat={vi.fn()}
        />,
      ),
    );

    expect(document.querySelector('[data-island="hunt"]')).toBeNull();
    expect(document.querySelector('[data-island="session"]')).toBeNull();
    expect(
      document.querySelector('[data-overlay-chrome][data-ask-first="true"]'),
    ).not.toBeNull();
  });

  it("keeps idle Mantine hunt without ask-first until a question tool is active", () => {
    renderDock(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <ToolDock {...dockBase} onOpenChat={vi.fn()} />
      </MantineProvider>,
    );

    const hunt = document.querySelector('[data-island="hunt"]');
    expect(hunt).not.toBeNull();
    expect(hunt?.getAttribute("data-ask-first")).toBeNull();
    expect(document.querySelector("[data-hunt-question-strip]")).not.toBeNull();
    expect(document.querySelector('[data-island="session"]')).not.toBeNull();
    expect(
      screen.getByText("Match").getAttribute("data-ios-tool-label"),
    ).toBe("");
    expect(screen.getByText("Match")).toHaveClass("jl-tool-slot-label");
    expect((hunt as HTMLElement | null)?.style.borderTop).not.toBe(
      "3px solid var(--color-flag)",
    );
  });
});

describe("HiderToolDock", () => {
  it("keeps session tools on the session island without a bottom Recenter chip", () => {
    const onOpenReportProblem = vi.fn();
    renderDock(
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
      ...(hunt?.querySelectorAll(DOCK_LABEL) ?? []),
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
    renderDock(
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
      ...(hunt?.querySelectorAll(DOCK_LABEL) ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels).toEqual(["Set zone", "Expansion"]);
    expect(screen.getByRole("button", { name: "Set zone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expansion" })).toBeInTheDocument();
  });

  it("places Hand next to Set zone when hand props are provided", () => {
    const onOpenHand = vi.fn();
    renderDock(
      <HiderToolDock
        zoneLabel="Set zone"
        onZoneAction={vi.fn()}
        handLabel="Hand 2/6"
        onOpenHand={onOpenHand}
        showExpansion={false}
        onExpansion={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenReportProblem={vi.fn()}
      />,
    );

    const hunt = document.querySelector('[data-island="hunt"]');
    const huntLabels = [
      ...(hunt?.querySelectorAll(DOCK_LABEL) ?? []),
    ].map((node) => node.textContent?.trim() ?? "");
    expect(huntLabels).toEqual(["Set zone", "Hand 2/6"]);
    fireEvent.click(screen.getByRole("button", { name: "Hand 2/6" }));
    expect(onOpenHand).toHaveBeenCalledTimes(1);
  });
});
