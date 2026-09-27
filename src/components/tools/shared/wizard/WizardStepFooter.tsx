import type { ReactNode } from "react";
import { WizardStepNav, type WizardStepNavProps } from "./WizardStepNav";

interface WizardStepFooterProps extends WizardStepNavProps {
  extra?: ReactNode;
}

export function WizardStepFooter({
  extra,
  ...navProps
}: WizardStepFooterProps) {
  if (extra) {
    return (
      <div className="flex flex-col gap-2 pt-0.5">
        <div className="min-w-0 text-center">{extra}</div>
        <div className="flex justify-end">
          <WizardStepNav {...navProps} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <WizardStepNav {...navProps} />
    </div>
  );
}
