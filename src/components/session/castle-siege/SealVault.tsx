import { useState } from "react";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import type { CastleSiegePlayingTeam } from "@/domain/session/castleSiege/pregame";
import {
  encryptSealPayload,
  SEAL_WRAP_KEY_ID_V1,
  type SealCipherEnvelopeV1,
} from "@/domain/session/castleSiege/sealCipher";
import { canonicalSealPayload, hashSealPayload } from "@/domain/session/castleSiege/sealHash";
import { writeTeamSealCipher, writeTeamSealHash } from "@/services/firestore/firestoreSessions";

export type SealVaultProps = {
  sessionId: string;
  teamId: CastleSiegePlayingTeam;
  sealedByUid: string;
  sealPosition: { lat: number; lng: number };
  onCommitted?: (hash: string) => void;
  wrappingKey?: Uint8Array;
  wrapKeyId?: string;
  encryptSeal?: (
    plaintext: string,
    options: { wrappingKey: Uint8Array; keyId: string },
  ) => Promise<SealCipherEnvelopeV1>;
};

/** Skin-S3 seal vault: name + secret → client hash (+ optional ciphertext) → teamSeals doc. */
export function SealVault({
  sessionId,
  teamId,
  sealedByUid,
  sealPosition,
  onCommitted,
  wrappingKey,
  wrapKeyId = SEAL_WRAP_KEY_ID_V1,
  encryptSeal = encryptSealPayload,
}: SealVaultProps) {
  const [anchorName, setAnchorName] = useState("");
  const [secretPhrase, setSecretPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [committedHash, setCommittedHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCommit = anchorName.trim().length > 0 && secretPhrase.trim().length > 0;

  const handleCommit = async () => {
    if (!canCommit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = canonicalSealPayload(
        anchorName.trim(),
        sealPosition.lat,
        sealPosition.lng,
        secretPhrase.trim(),
      );
      const hash = await hashSealPayload(payload);
      const sealedAt = new Date().toISOString();

      if (wrappingKey) {
        const ciphertext = await encryptSeal(payload, {
          wrappingKey,
          keyId: wrapKeyId,
        });
        await writeTeamSealCipher(sessionId, {
          teamId,
          hash,
          sealedByUid,
          sealedAt,
          ciphertext,
        });
      } else {
        await writeTeamSealHash(sessionId, {
          teamId,
          hash,
          sealedByUid,
          sealedAt,
        });
      }
      setCommittedHash(hash);
      setSecretPhrase("");
      onCommitted?.(hash);
    } catch {
      setError("Couldn't seal. Try again.");
    }
    setBusy(false);
  };

  const teamAccent = teamId === "teamA" ? "var(--color-flag)" : "var(--color-signal)";

  return (
    <section
      aria-label="Seal vault"
      data-testid="castle-siege-seal-vault"
      className="rounded-md border px-3 py-2.5"
      style={{
        borderColor: "var(--color-rule)",
        background: "oklch(from var(--color-canvas) l c h / 92%)",
        color: "var(--color-field-ink)",
        boxShadow: "var(--shadow-hud-float)",
      }}
    >
      <p
        className="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: teamAccent }}
      >
        Seal vault
      </p>

      {committedHash ? (
        <p
          className="m-0 mt-2 break-all font-mono text-xs"
          style={{ color: "var(--color-signal)" }}
        >
          Sealed · {committedHash.slice(0, 12)}…
        </p>
      ) : (
        <form
          className="mt-2 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCommit();
          }}
        >
          <label className="flex flex-col gap-1 text-xs">
            <span style={{ color: "var(--color-field-ink-muted)" }}>Anchor name</span>
            <input
              aria-label="Anchor name"
              value={anchorName}
              onChange={(event) => setAnchorName(event.target.value)}
              className="min-h-11 rounded-sm border px-3 text-sm"
              style={{
                borderColor: "var(--color-rule)",
                background: "oklch(from var(--color-canvas) l c h / 70%)",
                color: "var(--color-field-ink)",
              }}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span style={{ color: "var(--color-field-ink-muted)" }}>Secret phrase</span>
            <input
              aria-label="Secret phrase"
              type="password"
              value={secretPhrase}
              onChange={(event) => setSecretPhrase(event.target.value)}
              className="min-h-11 rounded-sm border px-3 text-sm"
              style={{
                borderColor: "var(--color-rule)",
                background: "oklch(from var(--color-canvas) l c h / 70%)",
                color: "var(--color-field-ink)",
              }}
              autoComplete="off"
            />
          </label>
          <EntryAsyncButton
            type="submit"
            busy={busy}
            unavailable={!canCommit}
            idleLabel="Commit seal"
            busyLabel="Sealing…"
            fullWidth
          />
          {error ? (
            <p className="m-0 text-xs" style={{ color: "var(--color-halt)" }} role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
