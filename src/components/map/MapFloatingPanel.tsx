import type { CSSProperties, Ref } from "react";
import type { PanelHandleProps } from "../../hooks/usePanelDrag";
import { useMotionProfile } from "../../hooks/useMotionProfile";
import { PopupCloseButton } from "../ui/PopupCloseButton";

type PeekHandleProps = PanelHandleProps & {
  onClick: () => void;
};

interface MapFloatingPanelProps {
  minimized: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  mapPanning?: boolean;
  title?: React.ReactNode;
  peekLabel?: string;
  peekHint?: string;
  onClose?: () => void;
  closeLabel?: string;
  maxHeightClassName?: string;
  bodyScrollable?: boolean;
  /** Live question wizards: scroll lives inside the panel body, not the shell. */
  panelLayout?: "default" | "wizard";
  outerClassName?: string;
  outerRef?: Ref<HTMLDivElement>;
  panelStyle?: CSSProperties;
  preserveBodyWhenMinimized?: boolean;
  dragHandle?: boolean;
  dragHandleProps?: PanelHandleProps;
  peekHandleProps?: PeekHandleProps;
  contentKey?: string | number;
  children: React.ReactNode;
}

export function MapFloatingPanel({
  minimized,
  onMinimizedChange,
  mapPanning = false,
  title,
  peekLabel,
  peekHint = "Tap to expand",
  onClose,
  closeLabel,
  maxHeightClassName = "max-h-[min(34dvh,320px)]",
  bodyScrollable = true,
  panelLayout = "default",
  outerClassName = "pointer-events-auto absolute inset-x-0 jl-panel-above-dock z-[var(--z-panel)] px-3",
  outerRef,
  panelStyle,
  preserveBodyWhenMinimized = true,
  dragHandle = true,
  dragHandleProps,
  peekHandleProps,
  contentKey,
  children,
}: MapFloatingPanelProps) {
  const { decorativeAnimate } = useMotionProfile();
  const panelMotionClass = !minimized && decorativeAnimate ? "jl-panel-enter" : "";

  const panelClassName = [
    outerClassName,
    mapPanning ? "jl-panel-chrome-hidden" : "",
    panelMotionClass,
    minimized ? "jl-panel-minimized" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bodyPreserverClass =
    preserveBodyWhenMinimized && minimized ? "jl-panel-body-preserver" : "";
  const isWizardLayout = panelLayout === "wizard";
  const shellScrollClass = isWizardLayout
    ? "flex min-h-0 flex-col overflow-hidden"
    : bodyScrollable
      ? "overflow-y-auto"
      : "overflow-hidden";

  return (
    <div ref={outerRef} className={panelClassName} style={panelStyle}>
      {minimized && peekLabel && onMinimizedChange ? (
        <button
          type="button"
          {...(peekHandleProps ?? { onClick: () => onMinimizedChange(false) })}
          className="tool-panel-compact hud-panel mx-auto flex max-w-xl min-h-11 w-full touch-none items-center justify-between gap-3 px-3 py-2"
          aria-label={`Expand ${peekLabel} panel`}
        >
          <span className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
            {peekLabel}
          </span>
          <span className="text-xs text-ink-muted">{peekHint}</span>
        </button>
      ) : null}
      <div
        className={`tool-panel-compact hud-panel relative mx-auto max-w-xl overscroll-contain p-3 pt-9 ${maxHeightClassName} ${shellScrollClass} ${bodyPreserverClass}`}
        aria-hidden={minimized && preserveBodyWhenMinimized}
      >
        {!minimized && dragHandle && dragHandleProps ? (
          <button
            type="button"
            aria-label="Drag panel down to minimize"
            className="jl-panel-drag-handle absolute inset-x-0 top-0 flex justify-center py-2"
            {...dragHandleProps}
          >
            <span className="jl-sheet-handle" aria-hidden="true" />
          </button>
        ) : null}
        {!minimized && onClose && closeLabel ? (
          <PopupCloseButton label={closeLabel} onClick={onClose} />
        ) : null}
        {!minimized && title ? (
          <div className="jl-tool-panel-title-row">
            <h2 className="jl-tool-panel-title">{title}</h2>
          </div>
        ) : null}
        <div
          key={contentKey}
          className={`jl-panel-crossfade-enter motion-reduce:animate-none ${
            isWizardLayout ? "flex min-h-0 flex-1 flex-col" : ""
          }`.trim()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
