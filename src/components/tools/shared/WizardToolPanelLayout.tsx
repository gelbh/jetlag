import type { ReactNode } from "react";

interface WizardToolPanelLayoutProps {
  children: ReactNode;
  /** Binary answer + commit controls pinned below the scroll region on live map. */
  stickyFooter?: ReactNode;
}

export function WizardToolPanelLayout({
  children,
  stickyFooter,
}: WizardToolPanelLayoutProps) {
  if (!stickyFooter) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="wizard-tool-scroll-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
      <div className="wizard-tool-sticky-footer shrink-0 border-t border-border/50 pt-2">
        {stickyFooter}
      </div>
    </div>
  );
}
