import { useRef, useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../../domain/session/advancedSessionSettings";
import type { MatchingAdminLevel } from "../../../domain/session/sessionCustomContent";
import { parseMatchingAreaGeoJson } from "../../../services/geo/matchingAreaGeoJson";
import type { GameArea } from "../../../domain/map/annotations";

const ADMIN_LEVEL_LABELS: Record<MatchingAdminLevel, string> = {
  4: "1st division (admin level 4)",
  6: "2nd division (admin level 6)",
  8: "3rd division (admin level 8)",
  9: "4th division (admin level 9)",
};

interface MatchingAreaUploadProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  gameArea?: GameArea | null;
  disabled?: boolean;
}

export function MatchingAreaUpload({
  value,
  onChange,
  gameArea,
  disabled,
}: MatchingAreaUploadProps) {
  const fileInputRefs = useRef<
    Partial<Record<MatchingAdminLevel, HTMLInputElement | null>>
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  return (
    <>
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
    </>
  );
}
