import { useId, useRef, useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../domain/session/advancedSessionSettings";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  createSessionCustomCategoryId,
  type MatchingAdminLevel,
  type SessionCustomCategory,
  type SessionCustomLocationPin,
} from "../../domain/session/sessionCustomContent";
import { parseMatchingAreaGeoJson } from "../../services/geo/matchingAreaGeoJson";
import type { GameArea } from "../../domain/map/annotations";

const ADMIN_LEVEL_LABELS: Record<MatchingAdminLevel, string> = {
  4: "1st division (admin level 4)",
  6: "2nd division (admin level 6)",
  8: "3rd division (admin level 8)",
  9: "4th division (admin level 9)",
};

interface SessionCustomContentSettingsProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  gameArea?: GameArea | null;
  disabled?: boolean;
}

function createPinId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-pin:${crypto.randomUUID()}`;
  }

  return `custom-pin:${Date.now()}`;
}

export function SessionCustomContentSettings({
  value,
  onChange,
  gameArea,
  disabled,
}: SessionCustomContentSettingsProps) {
  const fileInputRefs = useRef<Partial<Record<MatchingAdminLevel, HTMLInputElement | null>>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState({
    label: "",
    promptNoun: "",
    selectors: "",
  });
  const [pinDraft, setPinDraft] = useState({ name: "", lat: "", lng: "" });
  const panelId = useId();

  const handleMatchingAreaUpload = async (
    level: MatchingAdminLevel,
    file: File,
  ) => {
    if (!gameArea) {
      setUploadError("Frame a play area on the map before uploading boundaries.");
      return;
    }

    setUploadError(null);

    try {
      const text = await file.text();
      parseMatchingAreaGeoJson(text, gameArea, level);
      onChange({
        ...value,
        customMatchingAreas: {
          ...value.customMatchingAreas,
          [level]: text,
        },
      });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Couldn't import GeoJSON.",
      );
    }
  };

  const addCategory = () => {
    const label = categoryDraft.label.trim();
    const promptNoun = categoryDraft.promptNoun.trim();
    const selectors = categoryDraft.selectors
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!label || !promptNoun || selectors.length === 0) {
      return;
    }

    const category: SessionCustomCategory = {
      id: createSessionCustomCategoryId(label),
      label,
      promptNoun,
      overpassSelectors: selectors,
    };

    onChange({
      ...value,
      customCategories: [...value.customCategories, category],
    });
    setCategoryDraft({ label: "", promptNoun: "", selectors: "" });
  };

  const addPin = () => {
    const name = pinDraft.name.trim();
    const lat = Number.parseFloat(pinDraft.lat);
    const lng = Number.parseFloat(pinDraft.lng);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const pin: SessionCustomLocationPin = {
      id: createPinId(),
      name,
      point: [lat, lng] as LatLngTuple,
    };

    onChange({
      ...value,
      customLocationPins: [...value.customLocationPins, pin],
    });
    setPinDraft({ name: "", lat: "", lng: "" });
  };

  return (
    <div id={panelId} className="space-y-4 border-t border-border pt-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Custom matching areas
      </p>
      <p className="text-xs text-ink-muted">
        Upload GeoJSON FeatureCollections to replace OpenStreetMap admin
        boundaries for a division level in this session.
      </p>
      {!gameArea ? (
        <p className="text-xs text-status-warning">
          Frame a play area to validate imported boundaries.
        </p>
      ) : null}
      <div className="space-y-2">
        {([4, 6, 8, 9] as const).map((level) => {
          const uploaded = Boolean(value.customMatchingAreas[level]);

          return (
            <div
              key={level}
              className="flex flex-wrap items-center gap-2 text-sm text-ink"
            >
              <span className="min-w-0 flex-1">{ADMIN_LEVEL_LABELS[level]}</span>
              <input
                ref={(element) => {
                  fileInputRefs.current[level] = element;
                }}
                type="file"
                accept=".json,.geojson,application/geo+json,application/json"
                className="hidden"
                disabled={disabled}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleMatchingAreaUpload(level, file);
                  }
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRefs.current[level]?.click()}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-blue disabled:opacity-50"
              >
                {uploaded ? "Replace file" : "Upload GeoJSON"}
              </button>
              {uploaded ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const next = { ...value.customMatchingAreas };
                    delete next[level];
                    onChange({ ...value, customMatchingAreas: next });
                  }}
                  className="text-xs text-error"
                >
                  Remove
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {uploadError ? <p className="text-error text-sm">{uploadError}</p> : null}

      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Custom POI categories
      </p>
      <p className="text-xs text-ink-muted">
        Add Overpass tag selectors for Matching, Measuring, and Tentacle (one
        selector per line, e.g. amenity=police).
      </p>
      {value.customCategories.length > 0 ? (
        <ul className="space-y-1 text-sm text-ink">
          {value.customCategories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-2 border border-border px-2 py-1"
            >
              <span>
                {category.label}
                <span className="block text-xs text-ink-muted">
                  {category.overpassSelectors.join(", ")}
                </span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    customCategories: value.customCategories.filter(
                      (item) => item.id !== category.id,
                    ),
                  })
                }
                className="text-xs text-error"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="field-label text-xs">
          Label
          <input
            value={categoryDraft.label}
            disabled={disabled}
            onChange={(event) =>
              setCategoryDraft((current) => ({
                ...current,
                label: event.target.value,
              }))
            }
            className="field-input mt-1"
          />
        </label>
        <label className="field-label text-xs">
          Prompt noun
          <input
            value={categoryDraft.promptNoun}
            disabled={disabled}
            onChange={(event) =>
              setCategoryDraft((current) => ({
                ...current,
                promptNoun: event.target.value,
              }))
            }
            placeholder="police station"
            className="field-input mt-1"
          />
        </label>
      </div>
      <label className="field-label text-xs">
        Overpass selectors
        <textarea
          value={categoryDraft.selectors}
          disabled={disabled}
          onChange={(event) =>
            setCategoryDraft((current) => ({
              ...current,
              selectors: event.target.value,
            }))
          }
          rows={3}
          placeholder="[amenity=police]"
          className="field-input mt-1"
        />
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={addCategory}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-blue disabled:opacity-50"
      >
        Add category
      </button>

      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Manual location pins
      </p>
      <p className="text-xs text-ink-muted">
        Named points for Measuring and Tentacle when map data is missing.
      </p>
      {value.customLocationPins.length > 0 ? (
        <ul className="space-y-1 text-sm text-ink">
          {value.customLocationPins.map((pin) => (
            <li
              key={pin.id}
              className="flex items-center justify-between gap-2 border border-border px-2 py-1"
            >
              <span>
                {pin.name}
                <span className="block text-xs text-ink-muted">
                  {pin.point[0].toFixed(5)}, {pin.point[1].toFixed(5)}
                </span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    customLocationPins: value.customLocationPins.filter(
                      (item) => item.id !== pin.id,
                    ),
                  })
                }
                className="text-xs text-error"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="field-label text-xs sm:col-span-1">
          Name
          <input
            value={pinDraft.name}
            disabled={disabled}
            onChange={(event) =>
              setPinDraft((current) => ({ ...current, name: event.target.value }))
            }
            className="field-input mt-1"
          />
        </label>
        <label className="field-label text-xs">
          Latitude
          <input
            value={pinDraft.lat}
            disabled={disabled}
            onChange={(event) =>
              setPinDraft((current) => ({ ...current, lat: event.target.value }))
            }
            className="field-input mt-1"
            inputMode="decimal"
          />
        </label>
        <label className="field-label text-xs">
          Longitude
          <input
            value={pinDraft.lng}
            disabled={disabled}
            onChange={(event) =>
              setPinDraft((current) => ({ ...current, lng: event.target.value }))
            }
            className="field-input mt-1"
            inputMode="decimal"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={addPin}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-blue disabled:opacity-50"
      >
        Add pin
      </button>
    </div>
  );
}
