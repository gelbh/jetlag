import { Link } from "react-router-dom";
import { HudHomeIcon } from "./HudIcons";
import {
  screenBackLinkClassName,
  screenHeaderInsetTopClassName,
} from "./ScreenHeader";

type ScreenNavPlacement = "fixed" | "sticky" | "inline";

interface ScreenNavProps {
  variant?: "back" | "home";
  backTo?: string;
  backLabel?: string;
  homeTo?: string;
  /** fixed: viewport top bar; sticky: pins while parent scrolls; inline: in document flow */
  placement?: ScreenNavPlacement;
  className?: string;
}

export function ScreenNav({
  variant = "back",
  backTo = "/",
  backLabel = "Back",
  homeTo = "/",
  placement = "fixed",
  className = "",
}: ScreenNavProps) {
  const isHome = variant === "home";

  const shellClassName = (() => {
    if (isHome) {
      return `pointer-events-auto absolute inset-y-0 left-0 z-[var(--z-banner)] flex items-center px-[max(0.625rem,env(safe-area-inset-left))] ${className}`;
    }

    switch (placement) {
      case "inline":
        return `pointer-events-auto ${className}`;
      case "sticky":
        return `pointer-events-auto sticky top-0 z-[var(--z-banner)] -mx-4 mb-2 border-b-2 border-border bg-surface-deep px-4 pb-2 ${screenHeaderInsetTopClassName} ${className}`;
      case "fixed":
      default:
        return `pointer-events-auto fixed inset-x-0 top-0 z-[var(--z-banner)] border-b-2 border-border bg-surface-deep px-[max(0.625rem,env(safe-area-inset-left))] pb-2 ${screenHeaderInsetTopClassName} ${className}`;
    }
  })();

  return (
    <nav className={shellClassName} aria-label="Screen navigation">
      {isHome ? (
        <Link
          to={homeTo}
          className="hud-chrome map-hud-home inline-flex h-full min-w-11 items-center justify-center text-ink"
          aria-label="Home"
        >
          <HudHomeIcon className="h-5 w-5" />
        </Link>
      ) : (
        <Link to={backTo} className={screenBackLinkClassName}>
          ← {backLabel}
        </Link>
      )}
    </nav>
  );
}
