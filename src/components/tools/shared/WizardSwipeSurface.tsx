import { useEffect, useRef, useState, useContext, type ReactNode } from "react";
import { MotionCapabilityContext } from "../../motion/MotionCapabilityProvider";
import { useAdaptiveWizardSwipe } from "../../../hooks/useAdaptiveWizardSwipe";
import { MotionWizardSwipe } from "../../motion/MotionWizardSwipe";

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
  const capability = useContext(MotionCapabilityContext);
  const skipStepMotion =
    capability?.tier === "css" || capability?.tier === "static";
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStepIndex = useRef(stepIndex);
  const [enterClass, setEnterClass] = useState("");

  const { surfaceStyle, surfaceProps, useFramerSwipe } = useAdaptiveWizardSwipe({
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
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [stepIndex, skipStepMotion]);

  const stepContent = (
    <div
      key={stepId}
      className={`${enterClass} motion-reduce:animate-none`.trim()}
      style={useFramerSwipe ? undefined : surfaceStyle}
    >
      {children}
    </div>
  );

  if (useFramerSwipe) {
    return (
      <MotionWizardSwipe
        stepId={stepId}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        onBack={onBack}
        onNext={onNext}
        className={className}
      >
        {stepContent}
      </MotionWizardSwipe>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`wizard-swipe-surface touch-pan-y ${className}`.trim()}
      {...surfaceProps}
    >
      {stepContent}
    </div>
  );
}
