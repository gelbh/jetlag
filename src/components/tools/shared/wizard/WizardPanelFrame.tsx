import type { ReactNode } from "react";
import { InlineError } from "@/components/ui/banners/InlineError";
import { WizardToolPanelLayout } from "./WizardToolPanelLayout";

interface WizardPanelFrameProps {
  children: ReactNode;
  readOnly?: boolean;
  scrollable?: boolean;
  stickyFooter?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
}

export function WizardPanelFrame({
  children,
  readOnly = false,
  scrollable = false,
  stickyFooter,
  error,
  trailing,
}: WizardPanelFrameProps) {
  return (
    <>
      <div
        className={`flex min-h-0 flex-1 flex-col${
          readOnly ? " pointer-events-none select-none" : ""
        }`.trim()}
      >
        <WizardToolPanelLayout scrollable={scrollable} stickyFooter={stickyFooter}>
          {children}
        </WizardToolPanelLayout>
      </div>
      {error ? <InlineError className="shrink-0">{error}</InlineError> : null}
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </>
  );
}
