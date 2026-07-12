import { lazy, Suspense, useContext, type ReactNode } from "react";
import { useMotionGesturePath } from "../../hooks/useMotionGesturePath";
import { MotionCapabilityContext } from "./motionCapabilityContext";

const FramerWizardSwipe = lazy(() => import("./FramerWizardSwipe"));

interface MotionWizardSwipeProps {
  stepId: string;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
  className?: string;
}

export function MotionWizardSwipe({
  stepId,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  children,
  className = "",
}: MotionWizardSwipeProps) {
  const useFramerSwipe = useMotionGesturePath();
  const capability = useContext(MotionCapabilityContext);
  const framerReady = capability?.framerReady ?? false;

  if (useFramerSwipe && framerReady) {
    return (
      <Suspense fallback={<div className={className}>{children}</div>}>
        <FramerWizardSwipe
          stepId={stepId}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          onBack={onBack}
          onNext={onNext}
          className={className}
        >
          {children}
        </FramerWizardSwipe>
      </Suspense>
    );
  }

  return <div className={className}>{children}</div>;
}
