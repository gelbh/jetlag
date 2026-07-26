import type { DragEvent, ReactNode } from "react";
import {
  PANEL_LABELS,
  type GridStack,
  type PanelId,
} from "../../domain/admin/opsDeskLayout";
import {
  HudCloseIcon,
  HudCollapseIcon,
  HudExpandIcon,
  HudPinIcon,
} from "../ui/HudIcons";
import { AdminPanelBody, type AdminPanelBodies } from "./AdminPanelBody";

export const OPS_PANEL_MIME = "application/x-jl-ops-panel";

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
  onReorderPanel: (
    stackId: string,
    fromIndex: number,
    toIndex: number,
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
  onReorderPanel,
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
    event.dataTransfer.setData(OPS_PANEL_MIME, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: DragEvent) => {
    if (![...event.dataTransfer.types].includes(OPS_PANEL_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDropTargetChange(stack.id);
  };

  const handleDragLeave = () => {
    if (dropTargetStackId === stack.id) {
      onDropTargetChange(null);
    }
  };

  const applyDrop = (raw: string, toIndex: number | null) => {
    try {
      const payload = JSON.parse(raw) as PanelMergePayload;
      if (!payload?.sourceStackId || !payload?.panelId) return;

      if (payload.sourceStackId === stack.id) {
        const fromIndex = stack.panelIds.indexOf(payload.panelId);
        if (fromIndex < 0 || toIndex === null) return;
        onReorderPanel(stack.id, fromIndex, toIndex);
        return;
      }

      onMergePanel(stack.id, payload);
    } catch {
      // ignore malformed drag payload
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    onDropTargetChange(null);
    const raw = event.dataTransfer.getData(OPS_PANEL_MIME);
    if (!raw) return;
    const target = event.target as HTMLElement | null;
    const tab = target?.closest?.("[data-tab-index]") as HTMLElement | null;
    const toIndex =
      tab?.dataset.tabIndex !== undefined
        ? Number(tab.dataset.tabIndex)
        : multi
          ? stack.panelIds.length - 1
          : null;
    applyDrop(raw, Number.isFinite(toIndex) ? toIndex : null);
  };

  let titleNode: ReactNode;
  if (multi) {
    titleNode = (
      <div className="jl-scroll jl-ops-tabs" role="tablist" aria-label="Stacked panels">
        {stack.panelIds.map((panelId, index) => (
          <button
            key={panelId}
            type="button"
            role="tab"
            aria-selected={index === stack.activeIndex}
            data-tab-index={index}
            className={
              index === stack.activeIndex
                ? "jl-ops-tab jl-ops-tab--active"
                : "jl-ops-tab"
            }
            draggable
            onDragStart={(event) => handleDragStart(event, panelId)}
            onDragOver={handleDragOver}
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
            <HudPinIcon className="size-4" />
          </button>
          <button
            type="button"
            className="jl-ops-icon-btn"
            aria-pressed={stack.collapsed === true}
            aria-label={stack.collapsed ? "Expand panel" : "Collapse panel"}
            onClick={() => onCollapseToggle(stack.id)}
          >
            {stack.collapsed ? (
              <HudExpandIcon className="size-4" />
            ) : (
              <HudCollapseIcon className="size-4" />
            )}
          </button>
          <button
            type="button"
            className="jl-ops-icon-btn"
            aria-label="Close panel"
            onClick={() => onCloseActive(stack.id)}
          >
            <HudCloseIcon className="size-4" />
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
