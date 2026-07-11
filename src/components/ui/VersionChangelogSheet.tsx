import { useId, useState } from "react";
import { CHANGELOG, type ChangelogEntry } from "../../domain/device/changelog";
import { AnimatedOverlay } from "./AnimatedOverlay";
import { SheetHeader } from "./SheetHeader";

function userFacingChangelog(entries: readonly ChangelogEntry[]): ChangelogEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      sections: entry.sections.filter((section) => section.title !== "Technical"),
    }))
    .filter((entry) => entry.sections.length > 0);
}

function ChangelogEntrySections({ entry }: { entry: ChangelogEntry }) {
  return (
    <>
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
    </>
  );
}

function ChangelogVersionHeader({
  entry,
  highlight,
}: {
  entry: ChangelogEntry;
  highlight: boolean;
}) {
  return (
    <>
      <span className={highlight ? "text-highlight" : "text-ink"}>
        v{entry.version}
      </span>
      <span className="ml-2 font-normal normal-case tracking-normal text-ink-dim">
        {entry.date}
      </span>
    </>
  );
}

function CollapsibleChangelogEntry({
  entry,
  defaultOpen,
}: {
  entry: ChangelogEntry;
  defaultOpen: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

  if (defaultOpen) {
    return (
      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
          <ChangelogVersionHeader entry={entry} highlight />
        </h3>
        <ChangelogEntrySections entry={entry} />
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 border-2 border-border bg-surface-deep px-3 py-2 text-left"
      >
        <span className="font-display text-sm font-semibold uppercase tracking-wide">
          <ChangelogVersionHeader entry={entry} highlight={false} />
        </span>
        <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="space-y-2 pl-1">
          <ChangelogEntrySections entry={entry} />
        </div>
      ) : null}
    </section>
  );
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
      <SheetHeader title="Changelog" onClose={onClose} />

      <div className="space-y-5 overflow-y-auto pr-1">
        {visibleChangelog.map((entry, index) => (
          <CollapsibleChangelogEntry
            key={entry.version}
            entry={entry}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </AnimatedOverlay>
  );
}
