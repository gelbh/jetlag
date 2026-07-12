import { WizardStepFooter } from "./WizardStepFooter";

interface ToolWizardNavProps {
  stepIndex: number;
  stepCount: number;
  canGoBack?: boolean;
  canGoNext?: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}

export function ToolWizardNav({
  stepIndex,
  stepCount,
  canGoBack = stepIndex > 0,
  canGoNext = true,
  onBack,
  onNext,
  nextLabel = "Next step",
}: ToolWizardNavProps) {
  return (
    <WizardStepFooter
      stepIndex={stepIndex}
      stepCount={stepCount}
      canGoBack={canGoBack}
      canGoNext={canGoNext}
      onBack={onBack}
      onNext={onNext}
      nextLabel={nextLabel}
    />
  );
}
