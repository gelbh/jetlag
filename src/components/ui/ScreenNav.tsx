import { Link } from "react-router-dom";
import { HudHomeIcon } from "./HudIcons";

interface ScreenNavProps {
  variant?: "back" | "home";
  backTo?: string;
  backLabel?: string;
  homeTo?: string;
  className?: string;
}

export function ScreenNav({
  variant = "back",
  backTo = "/",
  backLabel = "Back",
  homeTo = "/",
  className = "",
}: ScreenNavProps) {
  return (
    <nav
      className={`pointer-events-auto fixed left-0 top-0 z-[var(--z-banner)] px-[max(0.625rem,env(safe-area-inset-left))] pt-[max(0.625rem,env(safe-area-inset-top))] ${className}`}
      aria-label="Screen navigation"
    >
      {variant === "home" ? (
        <Link
          to={homeTo}
          className="hud-chrome inline-flex min-h-11 min-w-11 items-center justify-center text-ink"
          aria-label="Home"
        >
          <HudHomeIcon className="h-5 w-5" />
        </Link>
      ) : (
        <Link
          to={backTo}
          className="inline-flex min-h-11 items-center font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-dim"
        >
          ← {backLabel}
        </Link>
      )}
    </nav>
  );
}
