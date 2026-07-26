import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_COLS,
  OPS_OVERVIEW_LAYOUT,
  cloneLayout,
} from "../../domain/admin/opsDeskLayout";
import {
  AdminGridWorkspace,
  commitWorkspaceGeometry,
} from "./AdminGridWorkspace";

vi.mock("react-grid-layout", () => ({
  default: ({ children }: { children: unknown }) => (
    <div data-testid="mock-grid">{children as never}</div>
  ),
  useContainerWidth: () => ({
    width: 1200,
    containerRef: { current: null },
    mounted: true,
  }),
  verticalCompactor: {},
}));

describe("AdminGridWorkspace", () => {
  it("clamps committed geometry so stacks never exceed cols", () => {
    const layout = cloneLayout(OPS_OVERVIEW_LAYOUT);
    const next = commitWorkspaceGeometry(layout, [
      { i: "sessions", x: 20, y: 0, w: 10, h: 5 },
    ]);
    const sessions = next.stacks.find((s) => s.id === "sessions");
    expect(sessions).toBeDefined();
    expect(sessions!.x + sessions!.w).toBeLessThanOrEqual(DEFAULT_COLS);
    expect(sessions!.w).toBeLessThanOrEqual(DEFAULT_COLS);
  });

  it("renders stack titles from the layout fixture", () => {
    const layout = cloneLayout(OPS_OVERVIEW_LAYOUT);
    render(
      <AdminGridWorkspace
        layout={layout}
        bodies={{
          sessions: <div>sessions-body</div>,
          monitor: <div>monitor-body</div>,
          inbox: <div>inbox-body</div>,
          detail: <div>detail-body</div>,
          actions: <div>actions-body</div>,
          settings: <div>settings-body</div>,
        }}
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

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ops-grid")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Pin panel").length).toBeGreaterThan(0);
  });
});
