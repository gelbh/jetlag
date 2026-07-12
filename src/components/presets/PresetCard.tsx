import type { ReactNode } from "react";

interface PresetCardProps {
  name: string;
  meta: ReactNode;
  location?: ReactNode;
  description?: ReactNode;
  badges?: ReactNode;
  headerAction?: ReactNode;
  actions: ReactNode;
}

export function PresetCard({
  name,
  meta,
  location,
  description,
  badges,
  headerAction,
  actions,
}: PresetCardProps) {
  return (
    <article className="home-card-btn home-card-btn-secondary flex-col items-stretch gap-3 !min-h-0 !h-auto py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base tracking-wide text-ink">{name}</p>
          <p className="mt-1 text-xs text-ink-muted">{meta}</p>
          {location ? <p className="mt-1 text-xs text-ink-dim">{location}</p> : null}
          {description ? (
            <p className="mt-2 text-xs text-ink-dim">{description}</p>
          ) : null}
          {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </article>
  );
}
