import { useState } from "react";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import {
  type CastleSiegeDials,
  DEFAULT_CASTLE_SIEGE_DIALS,
  normalizeCastleSiegeDials,
} from "@/domain/session/castleSiege/dials";

export type MusterDialsProps = {
  dials?: CastleSiegeDials | null;
  disabled?: boolean;
  onSave: (dials: CastleSiegeDials) => Promise<void>;
};

type DialField = {
  key: keyof CastleSiegeDials;
  label: string;
};

const FIELDS: DialField[] = [
  { key: "zoneRadiusMeters", label: "Zone radius (m)" },
  { key: "turnLengthSeconds", label: "Turn length (s)" },
  { key: "maxRounds", label: "Max rounds" },
  { key: "beltWidthMeters", label: "Belt width (m)" },
  { key: "breachToleranceMeters", label: "Breach tolerance (m)" },
  { key: "siegeLimitSeconds", label: "Siege limit (s)" },
];

/** Skin-S3 muster dials: Pregame stub controls persisted via setup patch. */
export function MusterDials({ dials, disabled = false, onSave }: MusterDialsProps) {
  const [draft, setDraft] = useState<CastleSiegeDials>(() =>
    normalizeCastleSiegeDials(dials ?? DEFAULT_CASTLE_SIEGE_DIALS),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (disabled || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = normalizeCastleSiegeDials(draft);
      await onSave(next);
      setDraft(next);
    } catch {
      setError("Couldn't save dials. Try again.");
    }
    setBusy(false);
  };

  return (
    <section
      aria-label="Muster dials"
      data-testid="castle-siege-muster-dials"
      className="rounded-md border px-3 py-2.5"
      style={{
        ...mapChromeSurfaceStyles,
        color: "var(--color-field-ink)",
      }}
    >
      <p
        className="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--color-signal)" }}
      >
        Muster dials
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="flex flex-col gap-1 text-xs">
            <span style={{ color: "var(--color-field-ink-muted)" }}>{field.label}</span>
            <input
              aria-label={field.label}
              type="number"
              inputMode="numeric"
              disabled={disabled || busy}
              value={draft[field.key]}
              onChange={(event) => {
                const value = Number(event.target.value);
                setDraft((prev) => ({ ...prev, [field.key]: value }));
              }}
              className="min-h-11 rounded-sm border px-2 text-sm"
              style={{
                borderColor: "var(--color-rule)",
                background: "oklch(from var(--color-canvas) l c h / 70%)",
                color: "var(--color-field-ink)",
              }}
            />
          </label>
        ))}
      </div>
      <div className="mt-2">
        <EntryAsyncButton
          type="button"
          busy={busy}
          unavailable={disabled}
          idleLabel="Save dials"
          busyLabel="Saving…"
          fullWidth
          onClick={() => void handleSave()}
        />
      </div>
      {error ? (
        <p className="m-0 mt-2 text-xs" style={{ color: "var(--color-halt)" }} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
