import { APP_VERSION, CHANGELOG, type ChangelogEntry } from "../../domain/device/changelog";
import { AnimatedOverlay } from "./AnimatedOverlay";

function userFacingChangelog(entries: readonly ChangelogEntry[]): ChangelogEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      sections: entry.sections.filter((section) => section.title !== "Technical"),
    }))
    .filter((entry) => entry.sections.length > 0);
}

interface VersionChangelogSheetProps {
  open: boolean;
  onClose: () => void;
}

export function VersionChangelogSheet({
  open,
  onClose,
}: VersionChangelogSheetProps) {
  const visibleChangelog = userFacingChangelog(CHANGELOG);

  return (
    <AnimatedOverlay
      open={open}
      onClose={onClose}
      ariaLabel="Changelog"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,560px)]"
    >
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
        {visibleChangelog.map((entry) => (
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
    </AnimatedOverlay>
  );
}
