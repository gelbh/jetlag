import { lazy, Suspense, type CSSProperties, type ReactNode, type Ref } from "react";
import { useContext } from "react";
import { useMotionGesturePath } from "../../hooks/useMotionGesturePath";
import type { PanelHandleProps } from "../../hooks/usePanelDrag";
import { MotionCapabilityContext } from "../motion/motionCapabilityContext";
import { PopupCloseButton } from "../ui/PopupCloseButton";

const FramerPanelDrag = lazy(() => import("../motion/FramerPanelDrag"));

interface MapFloatingPanelProps {
  minimized: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  mapPanning?: boolean;
  title?: ReactNode;
  peekLabel?: string;
  peekHint?: string;
  onClose?: () => void;
  closeLabel?: string;
  maxHeightClassName?: string;
  bodyScrollable?: boolean;
  outerClassName?: string;
  outerRef?: Ref<HTMLDivElement>;
  panelStyle?: CSSProperties;
  preserveBodyWhenMinimized?: boolean;
  dragHandle?: boolean;
  dragHandleProps?: PanelHandleProps;
  contentKey?: string | number;
  children: ReactNode;
}

function MapFloatingPanelBody({
  minimized,
  onMinimizedChange,
  title,
  peekLabel,
  peekHint = "Tap to expand",
  onClose,
  closeLabel,
  maxHeightClassName = "max-h-[min(34dvh,320px)]",
  bodyScrollable = true,
  preserveBodyWhenMinimized = true,
  dragHandle = true,
  dragHandleProps,
  contentKey,
  children,
}: Omit<MapFloatingPanelProps, "outerClassName" | "outerRef" | "panelStyle">) {
  const bodyPreserverClass =
    preserveBodyWhenMinimized && minimized ? "jl-panel-body-preserver" : "";

  return (
    <>
      {minimized && peekLabel && onMinimizedChange ? (
        <button
          type="button"
          onClick={() => onMinimizedChange(false)}
          className="tool-panel-compact hud-panel mx-auto flex max-w-xl min-h-11 w-full items-center justify-between gap-3 px-3 py-2"
          aria-label={`Expand ${peekLabel} panel`}
        >
          <span className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
            {peekLabel}
          </span>
          <span className="text-xs text-ink-muted">{peekHint}</span>
        </button>
      ) : null}
      <div
        className={`tool-panel-compact hud-panel relative mx-auto max-w-xl overscroll-contain p-3 pt-9 ${maxHeightClassName} ${bodyScrollable ? "overflow-y-auto" : "overflow-hidden"} ${bodyPreserverClass}`}
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
          className="jl-panel-crossfade-enter motion-reduce:animate-none"
        >
          {children}
        </div>
      </div>
    </>
  );
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
  outerClassName = "pointer-events-auto absolute inset-x-0 jl-panel-above-dock z-[var(--z-panel)] px-3",
  outerRef,
  panelStyle,
  preserveBodyWhenMinimized = true,
  dragHandle = true,
  dragHandleProps,
  contentKey,
  children,
}: MapFloatingPanelProps) {
  const capability = useContext(MotionCapabilityContext);
  const tier = capability?.tier ?? "css";
  const useFramerDrag = useMotionGesturePath();
  const panelMotionClass =
    !minimized && tier !== "css" && tier !== "static" ? "jl-panel-enter" : "";

  const panelClassName = [
    outerClassName,
    mapPanning ? "jl-panel-chrome-hidden" : "",
    panelMotionClass,
    minimized ? "jl-panel-minimized" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <MapFloatingPanelBody
      minimized={minimized}
      onMinimizedChange={onMinimizedChange}
      title={title}
      peekLabel={peekLabel}
      peekHint={peekHint}
      onClose={onClose}
      closeLabel={closeLabel}
      maxHeightClassName={maxHeightClassName}
      preserveBodyWhenMinimized={preserveBodyWhenMinimized}
      bodyScrollable={bodyScrollable}
      dragHandle={dragHandle}
      dragHandleProps={dragHandleProps}
      contentKey={contentKey}
    >
      {children}
    </MapFloatingPanelBody>
  );

  if (
    useFramerDrag &&
    !minimized &&
    onMinimizedChange &&
    dragHandle &&
    dragHandleProps
  ) {
    return (
      <Suspense
        fallback={
          <div ref={outerRef} className={panelClassName} style={panelStyle}>
            {body}
          </div>
        }
      >
        <FramerPanelDrag
          outerClassName={panelClassName}
          outerRef={outerRef}
          onMinimizedChange={onMinimizedChange}
        >
          {(framerHandleProps) => (
            <MapFloatingPanelBody
              minimized={minimized}
              onMinimizedChange={onMinimizedChange}
              title={title}
              peekLabel={peekLabel}
              peekHint={peekHint}
              onClose={onClose}
              closeLabel={closeLabel}
              maxHeightClassName={maxHeightClassName}
              preserveBodyWhenMinimized={preserveBodyWhenMinimized}
              bodyScrollable={bodyScrollable}
              dragHandle={dragHandle}
              dragHandleProps={framerHandleProps}
              contentKey={contentKey}
            >
              {children}
            </MapFloatingPanelBody>
          )}
        </FramerPanelDrag>
      </Suspense>
    );
  }

  return (
    <div ref={outerRef} className={panelClassName} style={panelStyle}>
      {body}
    </div>
  );
}
