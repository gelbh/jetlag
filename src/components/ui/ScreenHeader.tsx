import { Link } from "react-router-dom";
import { AppLogo } from "./AppLogo";

type ScreenHeaderPlacement = "fixed" | "sticky" | "inline";

export const screenBackLinkClassName =
  "inline-flex min-h-11 items-center gap-1 px-1 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-ink";

/** Clears the OS status bar on header shells (safe area + gap, with a 44px floor). */
export const screenHeaderInsetTopClassName =
  "pt-[max(2.75rem,calc(env(safe-area-inset-top,0px)+0.625rem))]";

/** Shared chrome for inline header wrappers (border, bg, bottom padding). */
export const screenHeaderShellClassName = `shrink-0 border-b-2 border-border bg-surface-deep pb-2 ${screenHeaderInsetTopClassName}`;

/** Top padding for page content below a fixed ScreenHeader. */
export const screenHeaderOffsetClassName =
  "pt-[max(6rem,calc(env(safe-area-inset-top,0px)+3.875rem))]";

interface ScreenHeaderProps {
  backTo?: string;
  backLabel?: string;
  placement?: ScreenHeaderPlacement;
  className?: string;
}

function shellClassName(placement: ScreenHeaderPlacement, className: string) {
  switch (placement) {
    case "inline":
      return className;
    case "sticky":
      return `pointer-events-auto sticky top-0 z-[var(--z-banner)] -mx-5 mb-2 border-b-2 border-border bg-surface-deep px-5 pb-2 ${screenHeaderInsetTopClassName} ${className}`;
    case "fixed":
    default:
      return `pointer-events-auto fixed inset-x-0 top-0 z-[var(--z-banner)] border-b-2 border-border bg-surface-deep px-[max(1.25rem,env(safe-area-inset-left))] pb-2 ${screenHeaderInsetTopClassName} ${className}`;
  }
}

export function ScreenHeader({
  backTo = "/",
  backLabel = "Back",
  placement = "fixed",
  className = "",
}: ScreenHeaderProps) {
  const content = (
    <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-3">
      <Link to={backTo} className={`${screenBackLinkClassName} justify-self-start`}>
        ← {backLabel}
      </Link>
      <AppLogo variant="lockup" size="sm" className="justify-self-center" />
      <span className="min-w-11" aria-hidden="true" />
    </div>
  );

  if (placement === "inline") {
    return <div className={className}>{content}</div>;
  }

  return (
    <header className={shellClassName(placement, className)} aria-label="Screen header">
      {content}
    </header>
  );
}
