import { useId, useMemo, useState } from "react";
import { AppLink } from "../navigation/AppLink";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  bundledPresetDefinition,
} from "../../domain/regions/bundledGamePresets";
import {
  buildBundledPresetTree,
  type BundledPresetTreeNode,
} from "../../domain/regions/bundledPresetHierarchy";
import { migrateGamePreset } from "../../domain/session/gamePreset";
import { PresetCard } from "./PresetCard";
import { PresetFavouriteButton } from "./PresetFavouriteButton";

type MigratedPreset = ReturnType<typeof migrateGamePreset>;

function PresetLeafCard({ preset }: { preset: MigratedPreset }) {
  const description = bundledPresetDefinition(preset.id)?.description;

  return (
    <PresetCard
      name={preset.name}
      meta={
        <>
          {preset.gameSize} · {preset.distanceUnit}
          {preset.placeLabel ? ` · ${preset.placeLabel}` : ""}
        </>
      }
      description={description}
      headerAction={<PresetFavouriteButton presetId={preset.id} />}
      actions={
        <AppLink
          to={`/create?preset=${preset.id}`}
          className="btn-primary min-h-10 px-3 text-xs"
        >
          Host
        </AppLink>
      }
    />
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
