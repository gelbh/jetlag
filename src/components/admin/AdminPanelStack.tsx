import type { DragEvent, ReactNode } from "react";
import {
  PANEL_LABELS,
  type GridStack,
  type PanelId,
} from "../../domain/admin/opsDeskLayout";
import { AdminPanelBody, type AdminPanelBodies } from "./AdminPanelBody";

const MERGE_MIME = "application/x-jl-ops-panel";

export type PanelMergePayload = {
  sourceStackId: string;
  panelId: PanelId;
};

interface AdminPanelStackProps {
  stack: GridStack;
  bodies: AdminPanelBodies;
  onActiveIndexChange: (stackId: string, activeIndex: number) => void;
  onPinToggle: (stackId: string) => void;
  onCollapseToggle: (stackId: string) => void;
  onCloseActive: (stackId: string) => void;
  onMergePanel: (
    targetStackId: string,
    payload: PanelMergePayload,
  ) => void;
  dropTargetStackId: string | null;
  onDropTargetChange: (stackId: string | null) => void;
}

function stackTitle(stack: GridStack): string {
  if (stack.panelIds.length === 1) {
    return PANEL_LABELS[stack.panelIds[0]!];
  }
  return "Stacked";
}

export function AdminPanelStack({
  stack,
  bodies,
  onActiveIndexChange,
  onPinToggle,
  onCollapseToggle,
  onCloseActive,
  onMergePanel,
  dropTargetStackId,
  onDropTargetChange,
}: AdminPanelStackProps) {
  const activePanelId =
    stack.panelIds[stack.activeIndex] ?? stack.panelIds[0] ?? null;
  const multi = stack.panelIds.length > 1;
  const isDropTarget = dropTargetStackId === stack.id;

  const handleDragStart = (event: DragEvent, panelId: PanelId) => {
    const payload: PanelMergePayload = {
      sourceStackId: stack.id,
      panelId,
    };
    event.dataTransfer.setData(MERGE_MIME, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: DragEvent) => {
    if (![...event.dataTransfer.types].includes(MERGE_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDropTargetChange(stack.id);
  };

  const handleDragLeave = () => {
    if (dropTargetStackId === stack.id) {
      onDropTargetChange(null);
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    onDropTargetChange(null);
    const raw = event.dataTransfer.getData(MERGE_MIME);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as PanelMergePayload;
      if (
        !payload?.sourceStackId ||
        !payload?.panelId ||
        payload.sourceStackId === stack.id
      ) {
        return;
      }
      onMergePanel(stack.id, payload);
    } catch {
      // ignore malformed drag payload
    }
  };

  let titleNode: ReactNode;
  if (multi) {
    titleNode = (
      <div className="jl-ops-tabs" role="tablist" aria-label="Stacked panels">
        {stack.panelIds.map((panelId, index) => (
          <button
            key={panelId}
            type="button"
            role="tab"
            aria-selected={index === stack.activeIndex}
            className={
              index === stack.activeIndex
                ? "jl-ops-tab jl-ops-tab--active"
                : "jl-ops-tab"
            }
            draggable
            onDragStart={(event) => handleDragStart(event, panelId)}
            onClick={() => onActiveIndexChange(stack.id, index)}
          >
            {PANEL_LABELS[panelId]}
          </button>
        ))}
      </div>
    );
  } else {
    titleNode = (
      <h2 className="jl-ops-stack-title">{stackTitle(stack)}</h2>
    );
  }

  return (
    <section
      className={[
        "jl-ops-stack",
        stack.collapsed ? "jl-ops-stack--collapsed" : "",
        stack.pinned ? "jl-ops-stack--pinned" : "",
        isDropTarget ? "jl-ops-drop-target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`admin-ops-stack-${stack.id}`}
      data-stack-id={stack.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="jl-ops-titlebar">
        <div
          className="jl-ops-drag-handle"
          draggable={!multi && !stack.pinned}
          onDragStart={
            !multi && activePanelId
              ? (event) => handleDragStart(event, activePanelId)
              : undefined
          }
        >
          {titleNode}
        </div>
        <div className="jl-ops-stack-controls">
          <button
            type="button"
            className={
              stack.pinned
                ? "jl-ops-icon-btn jl-ops-icon-btn--active"
                : "jl-ops-icon-btn"
            }
            aria-pressed={stack.pinned === true}
            aria-label={stack.pinned ? "Unpin panel" : "Pin panel"}
            onClick={() => onPinToggle(stack.id)}
          >
            Pin
          </button>
          <button
            type="button"
            className="jl-ops-icon-btn"
            aria-pressed={stack.collapsed === true}
            aria-label={stack.collapsed ? "Expand panel" : "Collapse panel"}
            onClick={() => onCollapseToggle(stack.id)}
          >
            {stack.collapsed ? "Open" : "Hide"}
          </button>
          <button
            type="button"
            className="jl-ops-icon-btn"
            aria-label="Close panel"
            onClick={() => onCloseActive(stack.id)}
          >
            Close
          </button>
        </div>
      </header>
      {!stack.collapsed && activePanelId ? (
        <div className="jl-ops-stack-body">
          <AdminPanelBody panelId={activePanelId} bodies={bodies} />
        </div>
      ) : null}
    </section>
  );
}
