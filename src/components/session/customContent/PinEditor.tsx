import { useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../../domain/session/advancedSessionSettings";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import type { SessionCustomLocationPin } from "../../../domain/session/sessionCustomContent";

interface PinEditorProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}

function createPinId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-pin:${crypto.randomUUID()}`;
  }

  return `custom-pin:${Date.now()}`;
}

export function PinEditor({ value, onChange, disabled }: PinEditorProps) {
  const [pinDraft, setPinDraft] = useState({ name: "", lat: "", lng: "" });

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
    <>
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
    </>
  );
}
