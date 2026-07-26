import type { DragEvent } from "react";
import { useMemo, useState } from "react";
import GridLayout, {
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  applyStackGeometry,
  type DeskLayout,
  type PanelId,
} from "../../domain/admin/opsDeskLayout";
import {
  AdminPanelStack,
  OPS_PANEL_MIME,
  type PanelMergePayload,
} from "./AdminPanelStack";
import type { AdminPanelBodies } from "./AdminPanelBody";

const COLLAPSED_H = 1;
const UNSTACK_DEFAULT_W = 4;
const UNSTACK_DEFAULT_H = 6;
const ALL_RESIZE_HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

interface AdminGridWorkspaceProps {
  layout: DeskLayout;
  bodies: AdminPanelBodies;
  onLayoutChange: (layout: DeskLayout) => void;
  onMergePanel: (
    targetStackId: string,
    payload: PanelMergePayload,
  ) => void;
  onReorderPanel: (
    stackId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  onUnstackPanel: (
    sourceStackId: string,
    panelId: PanelId,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  onActiveIndexChange: (stackId: string, activeIndex: number) => void;
  onPinToggle: (stackId: string) => void;
  onCollapseToggle: (stackId: string) => void;
  onCloseActive: (stackId: string) => void;
}

export function AdminGridWorkspace({
  layout,
  bodies,
  onLayoutChange,
  onMergePanel,
  onReorderPanel,
  onUnstackPanel,
  onActiveIndexChange,
  onPinToggle,
  onCollapseToggle,
  onCloseActive,
}: AdminGridWorkspaceProps) {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });
  const [dropTargetStackId, setDropTargetStackId] = useState<string | null>(
    null,
  );

  const rglLayout: Layout = useMemo(
    () =>
      layout.stacks.map((stack) => ({
        i: stack.id,
        x: stack.x,
        y: stack.y,
        w: stack.w,
        h: stack.collapsed ? COLLAPSED_H : stack.h,
        minH: stack.collapsed ? COLLAPSED_H : 2,
        static: stack.pinned === true,
        isDraggable: stack.pinned !== true,
        isResizable: stack.pinned !== true && !stack.collapsed,
      })),
    [layout.stacks],
  );

  const commitGeometry = (next: Layout) => {
    onLayoutChange(applyStackGeometry(layout, next));
  };

  const cellFromPointer = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el || width <= 0) {
      return { x: 0, y: 0 };
    }
    const rect = el.getBoundingClientRect();
    const colWidth = width / layout.cols;
    const rowPitch = layout.rowHeight + 8;
    const x = Math.max(
      0,
      Math.min(
        layout.cols - UNSTACK_DEFAULT_W,
        Math.floor((clientX - rect.left) / colWidth),
      ),
    );
    const y = Math.max(0, Math.floor((clientY - rect.top) / rowPitch));
    return { x, y };
  };

  const handleWorkspaceDragOver = (event: DragEvent) => {
    if (![...event.dataTransfer.types].includes(OPS_PANEL_MIME)) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-stack-id]")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetStackId(null);
  };

  const handleWorkspaceDrop = (event: DragEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-stack-id]")) return;
    const raw = event.dataTransfer.getData(OPS_PANEL_MIME);
    if (!raw) return;
    event.preventDefault();
    setDropTargetStackId(null);
    try {
      const payload = JSON.parse(raw) as PanelMergePayload;
      if (!payload?.sourceStackId || !payload?.panelId) return;
      const { x, y } = cellFromPointer(event.clientX, event.clientY);
      onUnstackPanel(
        payload.sourceStackId,
        payload.panelId,
        x,
        y,
        UNSTACK_DEFAULT_W,
        UNSTACK_DEFAULT_H,
      );
    } catch {
      // ignore malformed drag payload
    }
  };

  return (
    <div
      ref={containerRef}
      className="jl-scroll jl-ops-workspace"
      data-testid="admin-ops-grid"
      onDragOver={handleWorkspaceDragOver}
      onDrop={handleWorkspaceDrop}
    >
      {mounted ? (
        <GridLayout
          width={width}
          layout={rglLayout}
          gridConfig={{
            cols: layout.cols,
            rowHeight: layout.rowHeight,
            margin: [8, 8],
            containerPadding: [0, 0],
          }}
          dragConfig={{
            enabled: true,
            handle: ".jl-ops-drag-handle",
            cancel: "button,input,textarea,select,a,.jl-ops-tab",
          }}
          resizeConfig={{
            enabled: true,
            handles: [...ALL_RESIZE_HANDLES],
          }}
          compactor={verticalCompactor}
          onDragStop={(next) => commitGeometry(next)}
          onResizeStop={(next) => commitGeometry(next)}
        >
          {layout.stacks.map((stack) => (
            <div key={stack.id}>
              <AdminPanelStack
                stack={stack}
                bodies={bodies}
                onActiveIndexChange={onActiveIndexChange}
                onPinToggle={onPinToggle}
                onCollapseToggle={onCollapseToggle}
                onCloseActive={onCloseActive}
                onMergePanel={onMergePanel}
                onReorderPanel={onReorderPanel}
                dropTargetStackId={dropTargetStackId}
                onDropTargetChange={setDropTargetStackId}
              />
            </div>
          ))}
        </GridLayout>
      ) : null}
    </div>
  );
}
