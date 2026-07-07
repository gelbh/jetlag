import { useScrollLock } from "../../hooks/useScrollLock";
import { APP_VERSION, CHANGELOG } from "../../domain/changelog";
import { MobileSheet } from "./MobileSheet";

interface VersionChangelogSheetProps {
  open: boolean;
  onClose: () => void;
}

export function VersionChangelogSheet({
  open,
  onClose,
}: VersionChangelogSheetProps) {
  useScrollLock(open);

  if (!open) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain hud-scrim hud-scrim-enter"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <MobileSheet
          className="hud-sheet-enter mx-auto max-w-lg"
          maxHeightClassName="max-h-[min(70dvh,560px)]"
        >
          <div role="dialog" aria-modal="true" aria-label="Changelog">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold uppercase tracking-tight text-ink">
                Changelog
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary min-h-10 px-4 text-xs"
              >
                Close
              </button>
            </div>

            <p className="mb-4 text-sm text-ink-muted">
              Current version{" "}
              <span className="font-mono font-semibold text-ink">v{APP_VERSION}</span>
            </p>

            <div className="space-y-5 overflow-y-auto pr-1">
              {CHANGELOG.map((entry) => (
                <section key={entry.version} className="space-y-2">
                  <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-highlight">
                    v{entry.version}
                    <span className="ml-2 font-normal normal-case tracking-normal text-ink-dim">
                      {entry.date}
                    </span>
                  </h3>
                  {entry.sections.map((section) => (
                    <div key={section.title} className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {section.title}
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}
