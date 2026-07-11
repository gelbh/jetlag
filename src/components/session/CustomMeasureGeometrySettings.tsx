import { useId, useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../domain/session/advancedSessionSettings";
import {
  createCustomMeasureGeometryId,
  type SessionCustomMeasureGeometry,
} from "../../domain/session/customMeasureGeometry";

interface CustomMeasureGeometrySettingsProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}

function parseMeasureGeometryGeoJson(
  text: string,
  label: string,
): SessionCustomMeasureGeometry {
  const parsed = JSON.parse(text) as {
    type?: string;
    geometry?: { type?: string };
    features?: Array<{ geometry?: { type?: string } }>;
  };

  let geometryType: string | undefined;
  if (parsed.type === "Feature") {
    geometryType = parsed.geometry?.type;
  } else if (parsed.type === "FeatureCollection") {
    geometryType = parsed.features?.[0]?.geometry?.type;
  } else {
    geometryType = parsed.type;
  }

  if (geometryType !== "LineString" && geometryType !== "Polygon") {
    throw new Error("GeoJSON must be a LineString or Polygon.");
  }

  const feature =
    parsed.type === "Feature"
      ? parsed
      : parsed.type === "FeatureCollection" && parsed.features?.[0]
        ? parsed.features[0]
        : {
            type: "Feature",
            properties: {},
            geometry: parsed,
          };

  return {
    id: createCustomMeasureGeometryId(label),
    label,
    kind: geometryType === "Polygon" ? "polygon" : "line",
    geometryJson: JSON.stringify(feature),
  };
}

export function CustomMeasureGeometrySettings({
  value,
  onChange,
  disabled,
}: CustomMeasureGeometrySettingsProps) {
  const [label, setLabel] = useState("");
  const [geoJson, setGeoJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const labelInputId = useId();
  const geoJsonId = useId();
  const customMeasureGeometries = value.customMeasureGeometries ?? [];

  const addGeometry = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Enter a label for this measuring target.");
      return;
    }

    try {
      const geometry = parseMeasureGeometryGeoJson(geoJson.trim(), trimmedLabel);
      onChange({
        ...value,
        customMeasureGeometries: [...customMeasureGeometries, geometry],
      });
      setLabel("");
      setGeoJson("");
      setError(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Couldn't import GeoJSON.",
      );
    }
  };

  const removeGeometry = (id: string) => {
    onChange({
      ...value,
      customMeasureGeometries: customMeasureGeometries.filter(
        (geometry) => geometry.id !== id,
      ),
    });
  };

  return (
    <div className="space-y-3 rounded-[var(--radius-hud-md)] border border-border p-3">
      <div>
        <p id={panelId} className="text-sm font-semibold text-ink">
          Custom measuring geometry
        </p>
        <p className="text-xs text-ink-muted">
          Import a LineString or Polygon GeoJSON for coastline traces, HSR lines,
          or other custom measuring targets.
        </p>
      </div>

      {customMeasureGeometries.length > 0 ? (
        <ul className="space-y-1">
          {customMeasureGeometries.map((geometry) => (
            <li
              key={geometry.id}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-hud-md)] bg-surface-raised px-3 py-2 text-sm"
            >
              <span>
                {geometry.label}{" "}
                <span className="text-xs text-ink-muted">({geometry.kind})</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeGeometry(geometry.id)}
                className="min-h-11 px-2 text-xs font-semibold text-status-error disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label htmlFor={labelInputId} className="field-label">
        Label
        <input
          id={labelInputId}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={disabled}
          className="field-input min-h-11 w-full"
          placeholder="South coast trace"
          aria-describedby={panelId}
        />
      </label>
      <label htmlFor={geoJsonId} className="field-label">
        GeoJSON
        <textarea
          id={geoJsonId}
          value={geoJson}
          onChange={(event) => setGeoJson(event.target.value)}
          disabled={disabled}
          className="field-input min-h-24 w-full font-mono text-base"
          placeholder='Paste GeoJSON Feature or FeatureCollection…'
        />
      </label>
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <button
        type="button"
        disabled={disabled || !label.trim() || !geoJson.trim()}
        onClick={addGeometry}
        className="btn-secondary min-h-11 w-full disabled:opacity-50"
      >
        Add measuring geometry
      </button>
    </div>
  );
}
