import { useId, useState } from "react";
import { CHANGELOG, type ChangelogEntry } from "../../domain/device/changelog";
import {
  groupChangelogEntries,
  type ChangelogNode,
  type MajorGroupNode,
  type MinorGroupNode,
} from "../../domain/device/groupChangelog";
import { MotionSheet } from "../motion/MotionSheet";
import { SheetHeader } from "./SheetHeader";

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
  label,
  date,
  highlight,
}: {
  label: string;
  date: string;
  highlight: boolean;
}) {
  return (
    <>
      <span className={highlight ? "text-highlight" : "text-ink"}>v{label}</span>
      <span className="ml-2 font-normal normal-case tracking-normal text-ink-dim">
        {date}
      </span>
    </>
  );
}

function CollapsibleChangelogEntry({
  entry,
  defaultOpen,
  highlight,
}: {
  entry: ChangelogEntry;
  defaultOpen: boolean;
  highlight: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

  if (defaultOpen) {
    return (
      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
          <ChangelogVersionHeader
            label={entry.version}
            date={entry.date}
            highlight={highlight}
          />
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
          <ChangelogVersionHeader
            label={entry.version}
            date={entry.date}
            highlight={false}
          />
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

function ChangelogGroupSummary({ summary }: { summary: readonly string[] }) {
  if (summary.length === 0) {
    return null;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">
      {summary.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CollapsibleMinorGroup({
  group,
  defaultOpen,
}: {
  group: MinorGroupNode;
  defaultOpen: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

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
          <ChangelogVersionHeader
            label={group.label}
            date={group.date}
            highlight={false}
          />
        </span>
        <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="space-y-2 pl-1">
          <ChangelogGroupSummary summary={group.summary} />
          <div className="space-y-2">
            {group.children.map((entry, index) => (
              <CollapsibleChangelogEntry
                key={entry.version}
                entry={entry}
                defaultOpen={index === 0}
                highlight={false}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CollapsibleMajorGroup({ group }: { group: MajorGroupNode }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

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
          <ChangelogVersionHeader
            label={group.label}
            date={group.date}
            highlight={false}
          />
        </span>
        <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="space-y-2 pl-1">
          <ChangelogGroupSummary summary={group.summary} />
          <div className="space-y-2">
            {group.children.map((minorGroup) => (
              <CollapsibleMinorGroup
                key={minorGroup.label}
                group={minorGroup}
                defaultOpen={false}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ChangelogNodeView({
  node,
  isLatestVersion,
}: {
  node: ChangelogNode;
  isLatestVersion: boolean;
}) {
  switch (node.kind) {
    case "version":
      return (
        <CollapsibleChangelogEntry
          entry={node.entry}
          defaultOpen={isLatestVersion}
          highlight={isLatestVersion}
        />
      );
    case "minorGroup":
      return <CollapsibleMinorGroup group={node} defaultOpen={false} />;
    case "majorGroup":
      return <CollapsibleMajorGroup group={node} />;
    default: {
      const unreachable: never = node;
      return unreachable;
    }
  }
}

interface VersionChangelogSheetProps {
  open: boolean;
  onClose: () => void;
}

export function VersionChangelogSheet({
  open,
  onClose,
}: VersionChangelogSheetProps) {
  const changelogNodes = groupChangelogEntries(CHANGELOG);
  let latestVersionRendered = false;

  return (
    <MotionSheet
      open={open}
      onClose={onClose}
      ariaLabel="Changelog"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,560px)]"
    >
      <SheetHeader title="Changelog" onClose={onClose} />

      <div className="jl-selectable space-y-5 overflow-y-auto pr-1">
        {changelogNodes.map((node) => {
          const isLatestVersion =
            !latestVersionRendered && node.kind === "version";
          if (isLatestVersion) {
            latestVersionRendered = true;
          }

          return (
            <ChangelogNodeView
              key={
                node.kind === "version"
                  ? node.entry.version
                  : `${node.kind}-${node.label}`
              }
              node={node}
              isLatestVersion={isLatestVersion}
            />
          );
        })}
      </div>
    </MotionSheet>
  );
}
