import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  bundledPresetDefinition,
} from "../../domain/regions/bundledGamePresets";
import {
  buildBundledPresetTree,
  type BundledPresetTreeNode,
} from "../../domain/regions/bundledPresetHierarchy";
import { migrateGamePreset } from "../../domain/session/gamePreset";

type MigratedPreset = ReturnType<typeof migrateGamePreset>;

function PresetLeafCard({ preset }: { preset: MigratedPreset }) {
  const description = bundledPresetDefinition(preset.id)?.description;

  return (
    <article className="home-card-btn home-card-btn-secondary flex-col items-stretch gap-3 !min-h-0 !h-auto py-3">
      <div className="min-w-0">
        <p className="font-display text-base tracking-wide text-ink">{preset.name}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {preset.gameSize} · {preset.distanceUnit}
          {preset.placeLabel ? ` · ${preset.placeLabel}` : ""}
        </p>
        {description ? (
          <p className="mt-2 text-xs text-ink-dim">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/create?preset=${preset.id}`}
          className="btn-primary min-h-10 px-3 text-xs"
        >
          Host
        </Link>
      </div>
    </article>
  );
}

function PresetTreeGroup({
  node,
  depth,
  openGroupIds,
  onToggleGroup,
  presetsById,
}: {
  node: Extract<BundledPresetTreeNode, { kind: "group" }>;
  depth: number;
  openGroupIds: ReadonlySet<string>;
  onToggleGroup: (groupId: string) => void;
  presetsById: ReadonlyMap<string, MigratedPreset>;
}) {
  const panelId = useId();
  const open = openGroupIds.has(node.id);
  const childGroups = node.children.filter(
    (child): child is Extract<BundledPresetTreeNode, { kind: "group" }> =>
      child.kind === "group",
  );
  const childPresets = node.children.filter(
    (child): child is Extract<BundledPresetTreeNode, { kind: "preset" }> =>
      child.kind === "preset",
  );

  return (
    <div
      className={depth > 0 ? "border-l-2 border-border/70 pl-3" : undefined}
      style={depth > 0 ? { marginLeft: "0.125rem" } : undefined}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggleGroup(node.id)}
        className="flex min-h-11 w-full items-center justify-between gap-3 border-2 border-border bg-surface-deep px-3 py-2 text-left"
      >
        <span className="min-w-0">
          <span className="block font-display text-sm font-semibold tracking-wide text-ink">
            {node.name}
          </span>
          <span className="mt-0.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
            {node.category}
          </span>
        </span>
        <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <div id={panelId} className="mt-2 space-y-2 pb-1">
          {childPresets.map((child) => {
            const preset = presetsById.get(child.presetId);
            if (!preset) {
              return null;
            }

            return <PresetLeafCard key={child.presetId} preset={preset} />;
          })}
          {childGroups.map((child) => (
            <PresetTreeGroup
              key={child.id}
              node={child}
              depth={depth + 1}
              openGroupIds={openGroupIds}
              onToggleGroup={onToggleGroup}
              presetsById={presetsById}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BundledPresetTree({
  presets,
}: {
  presets: readonly MigratedPreset[];
}) {
  const tree = useMemo(
    () => buildBundledPresetTree(BUNDLED_GAME_PRESET_DEFINITIONS),
    [],
  );
  const presetsById = useMemo(
    () => new Map(presets.map((preset) => [preset.id, preset])),
    [presets],
  );
  const [openGroupIds, setOpenGroupIds] = useState(() => new Set<string>());

  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {tree.map((node) =>
        node.kind === "group" ? (
          <PresetTreeGroup
            key={node.id}
            node={node}
            depth={0}
            openGroupIds={openGroupIds}
            onToggleGroup={toggleGroup}
            presetsById={presetsById}
          />
        ) : null,
      )}
    </div>
  );
}
