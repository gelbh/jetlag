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
} from "../../domain/admin/opsDeskLayout";
import {
  AdminPanelStack,
  type PanelMergePayload,
} from "./AdminPanelStack";
import type { AdminPanelBodies } from "./AdminPanelBody";

const COLLAPSED_H = 1;

interface AdminGridWorkspaceProps {
  layout: DeskLayout;
  bodies: AdminPanelBodies;
  onLayoutChange: (layout: DeskLayout) => void;
  onMergePanel: (
    targetStackId: string,
    payload: PanelMergePayload,
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

  return (
    <div
      ref={containerRef}
      className="jl-ops-workspace"
      data-testid="admin-ops-grid"
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
            cancel: "button,input,textarea,select,a",
          }}
          resizeConfig={{ enabled: true, handles: ["se"] }}
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
