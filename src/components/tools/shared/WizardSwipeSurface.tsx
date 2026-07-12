import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMotionProfile } from "../../../hooks/useMotionProfile";
import { useWizardSwipe } from "../../../hooks/useWizardSwipe";

interface WizardSwipeSurfaceProps {
  stepId: string;
  stepIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Tutorial / read-only previews: natural height, no flex collapse. */
  embedded?: boolean;
  /** When false, children stay clickable without horizontal swipe handling. */
  swipeEnabled?: boolean;
}

export function WizardSwipeSurface({
  stepId,
  stepIndex,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  children,
  footer,
  className = "",
  embedded = false,
  swipeEnabled = true,
}: WizardSwipeSurfaceProps) {
  const { animate } = useMotionProfile();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStepIndex = useRef(stepIndex);
  const [enterClass, setEnterClass] = useState("");

  const { surfaceStyle, surfaceProps } = useWizardSwipe({
    canGoBack,
    canGoNext,
    onBack,
    onNext,
    containerRef,
  });

  useEffect(() => {
    if (!animate || prevStepIndex.current === stepIndex) {
      return;
    }

    const direction =
      stepIndex > prevStepIndex.current ? "forward" : "back";

    prevStepIndex.current = stepIndex;
    setEnterClass(
      direction === "forward"
        ? "jl-wizard-step-forward"
        : "jl-wizard-step-back",
    );

    const timeoutId = window.setTimeout(() => {
      setEnterClass("");
    }, 320);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [stepIndex, animate]);

  const surfaceLayout = embedded
    ? "wizard-swipe-surface-embedded flex flex-col"
    : "flex min-h-0 flex-1 flex-col overflow-hidden";
  const stepLayout = embedded
    ? "flex flex-col"
    : "flex min-h-0 flex-1 flex-col overflow-hidden";
  const bodyLayout = embedded
    ? "wizard-swipe-body flex flex-col"
    : "wizard-swipe-body flex min-h-0 flex-1 flex-col overflow-hidden";

  return (
    <div
      ref={containerRef}
      className={`wizard-swipe-surface ${surfaceLayout} ${className}`.trim()}
      {...(swipeEnabled && !embedded ? surfaceProps : undefined)}
    >
      <div
        key={stepId}
        className={`${stepLayout} ${enterClass} motion-reduce:animate-none`.trim()}
        style={surfaceStyle}
      >
        <div className={bodyLayout}>
          {children}
        </div>
        {footer ? (
          <div className="wizard-swipe-footer shrink-0 pt-1">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
