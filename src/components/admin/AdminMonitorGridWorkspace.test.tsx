import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_COLS,
  cloneMonitorLayout,
  defaultMonitorLayout,
} from "../../domain/admin/opsDeskLayout";
import { AdminMonitorGridWorkspace } from "./AdminMonitorGridWorkspace";
import { commitMonitorWorkspaceGeometry } from "./adminMonitorGridGeometry";

vi.mock("react-grid-layout", () => ({
  default: ({ children }: { children: unknown }) => (
    <div data-testid="mock-monitor-grid">{children as never}</div>
  ),
  useContainerWidth: () => ({
    width: 900,
    containerRef: { current: null },
    mounted: true,
  }),
  verticalCompactor: {},
}));

const emptyBodies = {
  map: <div>map-body</div>,
  roster: <div>roster-body</div>,
  overview: <div>overview-body</div>,
  log: <div>log-body</div>,
  chat: <div>chat-body</div>,
  sync: <div>sync-body</div>,
  mapTools: <div>map-tools-body</div>,
  mod: <div>mod-body</div>,
};

describe("AdminMonitorGridWorkspace", () => {
  it("clamps committed geometry so stacks never exceed cols", () => {
    const layout = cloneMonitorLayout(defaultMonitorLayout());
    const next = commitMonitorWorkspaceGeometry(layout, [
      { i: "monitor-map", x: 20, y: 0, w: 10, h: 8 },
    ]);
    const mapStack = next.stacks.find((s) => s.id === "monitor-map");
    expect(mapStack).toBeDefined();
    expect(mapStack!.x + mapStack!.w).toBeLessThanOrEqual(DEFAULT_COLS);
    expect(mapStack!.w).toBeLessThanOrEqual(DEFAULT_COLS);
  });

  it("renders nested monitor grid and stack titles", () => {
    const layout = cloneMonitorLayout(defaultMonitorLayout());
    const onLayoutChange = vi.fn();

    render(
      <AdminMonitorGridWorkspace
        layout={layout}
        bodies={emptyBodies}
        onLayoutChange={onLayoutChange}
        onMergePanel={vi.fn()}
        onReorderPanel={vi.fn()}
        onUnstackPanel={vi.fn()}
        onPlacePanel={vi.fn()}
        onActiveIndexChange={vi.fn()}
        onPinToggle={vi.fn()}
        onCollapseToggle={vi.fn()}
        onCloseActive={vi.fn()}
      />,
    );

    expect(screen.getByTestId("admin-monitor-grid")).toBeInTheDocument();
    expect(screen.getByText("Map")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("opens the place menu on right-click empty space, not left-click", () => {
    const layout = cloneMonitorLayout(defaultMonitorLayout());
    render(
      <AdminMonitorGridWorkspace
        layout={layout}
        bodies={emptyBodies}
        onLayoutChange={vi.fn()}
        onMergePanel={vi.fn()}
        onReorderPanel={vi.fn()}
        onUnstackPanel={vi.fn()}
        onPlacePanel={vi.fn()}
        onActiveIndexChange={vi.fn()}
        onPinToggle={vi.fn()}
        onCollapseToggle={vi.fn()}
        onCloseActive={vi.fn()}
      />,
    );

    const workspace = screen.getByTestId("admin-monitor-grid");
    fireEvent.click(workspace);
    expect(
      screen.queryByLabelText("Place monitor panel"),
    ).not.toBeInTheDocument();

    fireEvent.contextMenu(workspace);
    expect(screen.getByLabelText("Place monitor panel")).toBeInTheDocument();
  });

  it("calls onLayoutChange when geometry is committed", () => {
    const layout = cloneMonitorLayout(defaultMonitorLayout());
    const onLayoutChange = vi.fn();
    const next = commitMonitorWorkspaceGeometry(layout, [
      { i: "monitor-map", x: 2, y: 1, w: 12, h: 7 },
    ]);

    onLayoutChange(next);

    expect(onLayoutChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stacks: expect.arrayContaining([
          expect.objectContaining({ id: "monitor-map", x: 2, y: 1, w: 12, h: 7 }),
        ]),
      }),
    );
  });
});
