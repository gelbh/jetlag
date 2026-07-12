import type { ReactNode } from "react";

interface WizardToolPanelLayoutProps {
  children: ReactNode;
  /** Binary answer + commit controls pinned below the scroll region on live map. */
  stickyFooter?: ReactNode;
  /** Live map: constrain height and scroll step content above an optional footer. */
  scrollable?: boolean;
}

export function WizardToolPanelLayout({
  children,
  stickyFooter,
  scrollable = false,
}: WizardToolPanelLayoutProps) {
  if (!scrollable && !stickyFooter) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="wizard-tool-scroll-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
      {stickyFooter ? (
        <div className="wizard-tool-sticky-footer shrink-0 border-t border-border/50 pt-2">
          {stickyFooter}
        </div>
      ) : null}
    </div>
  );
}
