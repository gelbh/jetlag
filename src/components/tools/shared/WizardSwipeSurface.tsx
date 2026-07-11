import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWizardSwipe } from "../../../hooks/useWizardSwipe";

interface WizardSwipeSurfaceProps {
  stepId: string;
  stepIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
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
  className = "",
}: WizardSwipeSurfaceProps) {
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
    if (prevStepIndex.current === stepIndex) {
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
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [stepIndex]);

  return (
    <div
      ref={containerRef}
      className={`wizard-swipe-surface touch-pan-y ${className}`.trim()}
      {...surfaceProps}
    >
      <div
        key={stepId}
        className={`${enterClass} motion-reduce:animate-none`.trim()}
        style={surfaceStyle}
      >
        {children}
      </div>
    </div>
  );
}
