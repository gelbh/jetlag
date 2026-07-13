import { AppLink } from "../navigation/AppLink";
import {
  bundledPresetDefinition,
  isBundledPresetId,
} from "../../domain/regions/bundledGamePresets";
import { formatBundledPresetLocation } from "../../domain/regions/bundledPresetHierarchy";
import { migrateGamePreset } from "../../domain/session/gamePreset";
import { PresetCard } from "./PresetCard";
import { PresetFavouriteButton } from "./PresetFavouriteButton";

type MigratedPreset = ReturnType<typeof migrateGamePreset>;

function PresetSearchResultCard({
  preset,
  onDelete,
}: {
  preset: MigratedPreset;
  onDelete: (id: string) => void;
}) {
  const bundled = isBundledPresetId(preset.id);
  const definition = bundled ? bundledPresetDefinition(preset.id) : undefined;
  const description = definition?.description;
  const location = definition
    ? formatBundledPresetLocation(definition)
    : undefined;

  return (
    <PresetCard
      name={preset.name}
      meta={
        <>
          {preset.gameSize} · {preset.distanceUnit}
          {preset.placeLabel ? ` · ${preset.placeLabel}` : ""}
        </>
      }
      location={location}
      description={description}
      badges={
        !bundled ? (
          <>
            {preset.advancedSettings.expansionPackEnabled ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-blue">
                Expansion
              </span>
            ) : null}
            {preset.advancedSettings.customQuestionPackEnabled ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-blue">
                Custom Q
              </span>
            ) : null}
            {preset.migrationStatus === "manual_required" ? (
              <span className="rounded-full border border-status-warning/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-status-warning">
                Review
              </span>
            ) : null}
          </>
        ) : undefined
      }
      headerAction={<PresetFavouriteButton presetId={preset.id} />}
      actions={
        <>
          {preset.migrationStatus === "manual_required" ? (
            <AppLink
              to={`/presets/${preset.id}/edit`}
              className="btn-primary min-h-10 px-3 text-xs"
            >
              Review
            </AppLink>
          ) : (
            <AppLink
              to={`/create?preset=${preset.id}`}
              className="btn-primary min-h-10 px-3 text-xs"
            >
              Host
            </AppLink>
          )}
          {!bundled ? (
            <>
              <AppLink
                to={`/presets/${preset.id}/edit`}
                className="btn-secondary min-h-10 px-3 text-xs"
              >
                Edit
              </AppLink>
              <button
                type="button"
                onClick={() => onDelete(preset.id)}
                className="btn-secondary min-h-10 px-3 text-xs text-error"
              >
                Delete
              </button>
            </>
          ) : null}
        </>
      }
    />
  );
}

export function PresetSearchResults({
  presets,
  onDelete,
}: {
  presets: readonly MigratedPreset[];
  onDelete: (id: string) => void;
}) {
  if (presets.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No presets match your search.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {presets.map((preset) => (
        <li key={preset.id}>
          <PresetSearchResultCard preset={preset} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
