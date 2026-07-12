import { useEffect, useRef, useState, useContext, type ReactNode } from "react";
import { MotionCapabilityContext } from "../../motion/motionCapabilityContext";
import { useAdaptiveWizardSwipe } from "../../../hooks/useAdaptiveWizardSwipe";

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
}: WizardSwipeSurfaceProps) {
  const capability = useContext(MotionCapabilityContext);
  const skipStepMotion =
    capability?.tier === "css" || capability?.tier === "static";
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStepIndex = useRef(stepIndex);
  const [enterClass, setEnterClass] = useState("");

  const { surfaceStyle, surfaceProps } = useAdaptiveWizardSwipe({
    canGoBack,
    canGoNext,
    onBack,
    onNext,
    containerRef,
  });

  useEffect(() => {
    if (skipStepMotion || prevStepIndex.current === stepIndex) {
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
  }, [stepIndex, skipStepMotion]);

  return (
    <div
      ref={containerRef}
      className={`wizard-swipe-surface flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}
      {...surfaceProps}
    >
      <div
        key={stepId}
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${enterClass} motion-reduce:animate-none`.trim()}
        style={surfaceStyle}
      >
        <div className="wizard-swipe-body flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
        {footer ? (
          <div className="wizard-swipe-footer shrink-0 pt-1">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
