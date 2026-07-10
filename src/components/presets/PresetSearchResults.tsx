import { Link } from "react-router-dom";
import {
  bundledPresetDefinition,
  isBundledPresetId,
} from "../../domain/regions/bundledGamePresets";
import { formatBundledPresetLocation } from "../../domain/regions/bundledPresetHierarchy";
import { migrateGamePreset } from "../../domain/session/gamePreset";

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
    <li className="home-card-btn home-card-btn-secondary flex-col items-stretch gap-3 !min-h-0 !h-auto py-3">
      <div className="min-w-0">
        <p className="font-display text-base tracking-wide text-ink">{preset.name}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {preset.gameSize} · {preset.distanceUnit}
          {preset.placeLabel ? ` · ${preset.placeLabel}` : ""}
        </p>
        {location ? (
          <p className="mt-1 text-xs text-ink-dim">{location}</p>
        ) : null}
        {description ? (
          <p className="mt-2 text-xs text-ink-dim">{description}</p>
        ) : null}
        {!bundled ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
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
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {preset.migrationStatus === "manual_required" ? (
          <Link
            to={`/presets/${preset.id}/edit`}
            className="btn-primary min-h-10 px-3 text-xs"
          >
            Review
          </Link>
        ) : (
          <Link
            to={`/create?preset=${preset.id}`}
            className="btn-primary min-h-10 px-3 text-xs"
          >
            Host
          </Link>
        )}
        {!bundled ? (
          <>
            <Link
              to={`/presets/${preset.id}/edit`}
              className="btn-secondary min-h-10 px-3 text-xs"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => onDelete(preset.id)}
              className="btn-secondary min-h-10 px-3 text-xs text-error"
            >
              Delete
            </button>
          </>
        ) : null}
      </div>
    </li>
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
        <PresetSearchResultCard
          key={preset.id}
          preset={preset}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
