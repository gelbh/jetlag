import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLogo } from "../components/ui/AppLogo";
import { AdvancedSessionSettings } from "../components/session/AdvancedSessionSettings";
import { GameSizePicker } from "../components/session/GameSizePicker";
import {
  defaultAdvancedSessionSettings,
  type AdvancedSessionSettingsValue,
} from "../domain/session/advancedSessionSettings";
import type { DistanceUnit } from "../domain/map/distance";
import { hidingZoneRadiusMeters, type GameSize } from "../domain/session/gameSize";
import {
  createGamePresetId,
  createSessionDraftToGamePreset,
  type CreateSessionDraft,
} from "../domain/session/gamePreset";
import { useGamePresetStore } from "../state/gamePresetStore";

export function GamePresetEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const presets = useGamePresetStore((state) => state.presets);
  const savePreset = useGamePresetStore((state) => state.savePreset);
  const deletePreset = useGamePresetStore((state) => state.deletePreset);

  const existing = useMemo(
    () => (id ? presets.find((preset) => preset.id === id) : undefined),
    [id, presets],
  );

  const [name, setName] = useState(existing?.name ?? "");
  const [gameSize, setGameSize] = useState<GameSize>(existing?.gameSize ?? "medium");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(
    existing?.distanceUnit ?? "imperial",
  );
  const [advancedSettings, setAdvancedSettings] =
    useState<AdvancedSessionSettingsValue>(
      () =>
        existing?.advancedSettings ??
        defaultAdvancedSessionSettings("medium", "imperial"),
    );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a preset name.");
      return;
    }

    const draft: CreateSessionDraft = {
      gameSize,
      distanceUnit,
      advancedSettings,
    };

    const preset = createSessionDraftToGamePreset(
      draft,
      trimmed,
      existing?.id ?? createGamePresetId(),
    );

    savePreset({
      ...preset,
      createdAt: existing?.createdAt ?? preset.createdAt,
      updatedAt: new Date().toISOString(),
      gameArea: existing?.gameArea,
      placeLabel: existing?.placeLabel,
      focusBounds: existing?.focusBounds,
      sessionTier: existing?.sessionTier,
    });

    navigate("/presets");
  };

  return (
    <main className="flex min-h-[100dvh] flex-col px-5 py-8">
      <div className="space-y-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AppLogo variant="mark" size="sm" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          {existing ? "Edit preset" : "New preset"}
        </h1>

        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
          Preset name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            className="field-input mt-2"
          />
        </label>

        <div className="space-y-2">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
            Distance edition
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["imperial", "metric"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  setDistanceUnit(unit);
                  setAdvancedSettings(defaultAdvancedSessionSettings(gameSize, unit));
                }}
                className={`min-h-11 border-2 px-3 py-2 text-sm font-semibold ${
                  distanceUnit === unit
                    ? "border-highlight bg-highlight-soft text-highlight"
                    : "border-border bg-surface-deep text-ink"
                }`}
              >
                {unit === "metric" ? "Metric (km)" : "Imperial (mi)"}
              </button>
            ))}
          </div>
        </div>

        <GameSizePicker
          gameArea={null}
          value={gameSize}
          distanceUnit={distanceUnit}
          onChange={(size) => {
            setGameSize(size);
            setAdvancedSettings((current) => ({
              ...defaultAdvancedSessionSettings(size, distanceUnit),
              ...current,
              hidingZoneRadiusMeters: hidingZoneRadiusMeters(size, distanceUnit),
            }));
          }}
        />

        <AdvancedSessionSettings
          gameSize={gameSize}
          distanceUnit={distanceUnit}
          value={advancedSettings}
          onChange={setAdvancedSettings}
          collapsible={false}
        />

        {error ? <p className="text-error">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} className="btn-primary">
            Save preset
          </button>
          {existing ? (
            <button
              type="button"
              onClick={() => {
                deletePreset(existing.id);
                navigate("/presets");
              }}
              className="btn-secondary"
            >
              Delete
            </button>
          ) : null}
          <Link to="/presets" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}

export function GamePresetList() {
  const presets = useGamePresetStore((state) => state.presets);
  const deletePreset = useGamePresetStore((state) => state.deletePreset);

  return (
    <main className="flex min-h-[100dvh] flex-col px-5 py-8">
      <div className="space-y-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AppLogo variant="mark" size="sm" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          Custom games
        </h1>
        <p className="text-sm text-ink-muted">
          Saved templates pre-fill create session. Game area can be added when
          hosting.
        </p>

        <Link to="/presets/new" className="btn-primary inline-flex w-fit">
          New preset
        </Link>

        {presets.length === 0 ? (
          <p className="text-sm text-ink-dim">No presets saved on this device.</p>
        ) : (
          <ul className="space-y-2">
            {presets.map((preset) => (
              <li
                key={preset.id}
                className="flex items-center justify-between gap-3 border-2 border-border bg-surface-deep px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-ink">{preset.name}</p>
                  <p className="text-xs text-ink-muted">
                    {preset.gameSize} · {preset.distanceUnit}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/create?preset=${preset.id}`}
                    className="text-sm font-semibold text-brand-blue"
                  >
                    Host
                  </Link>
                  <Link
                    to={`/presets/${preset.id}/edit`}
                    className="text-sm font-semibold text-brand-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => deletePreset(preset.id)}
                    className="text-sm text-error"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link to="/" className="btn-secondary inline-flex w-fit">
          Home
        </Link>
      </div>
    </main>
  );
}
