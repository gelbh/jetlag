import { useState } from "react";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { gameAreaCenter } from "@/domain/geometry/gameArea/geometry";
import type { SessionRecord } from "@/domain/map/annotations";
import { arenaFromGameArea } from "@/domain/session/castleSiege/arena";
import type { CastleSiegeDials } from "@/domain/session/castleSiege/dials";
import type { FairSplitLockPatch } from "@/domain/session/castleSiege/fairSplitLock";
import { isCastleSiegeSession } from "@/domain/session/castleSiege/mode";
import type { CastleSiegeSealPoint } from "@/domain/session/castleSiege/pregame";
import {
  isCastleSiegePlayingRole,
  resolveCastleSiegeRole,
} from "@/domain/session/castleSiege/teamRole";
import { updateCastleSiegeSetup } from "@/services/firestore/firestoreSessions";
import { ArenaLedger } from "./ArenaLedger";
import { FairSplitProposal } from "./FairSplitProposal";
import { MusterDials } from "./MusterDials";
import { SealVault } from "./SealVault";

export type CastleSiegeSetupChromeProps = {
  session: SessionRecord | null | undefined;
  uid: string | null | undefined;
  isHost?: boolean;
  /**
   * Real Fair-split seal coordinates (map pins). When either is missing, Fair-split
   * propose/lock is gated so stub halves are never persisted.
   */
  sealA?: CastleSiegeSealPoint;
  sealB?: CastleSiegeSealPoint;
};

/**
 * Skin-S3 setup chrome (Pregame + Fair-split). Castle Siege only (V14).
 * Classic HUD callers stay unchanged when this returns null.
 */
export function CastleSiegeSetupChrome({
  session,
  uid,
  isHost = false,
  sealA,
  sealB,
}: CastleSiegeSetupChromeProps) {
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isCastleSiegeSession(session) || !session) {
    return null;
  }

  const role = resolveCastleSiegeRole(session.castleSiegeRoles, uid ?? undefined);
  const playing = isCastleSiegePlayingRole(role);
  const [lat, lng] = gameAreaCenter(session.gameArea);
  const sealPosition = { lat, lng };

  const importArenaFromGameArea = async () => {
    if (!isHost || importBusy) return;
    setImportBusy(true);
    setImportError(null);
    try {
      const arena = arenaFromGameArea(session.gameArea);
      await updateCastleSiegeSetup(session.id, { arena });
    } catch {
      setImportError("Couldn't import arena. Try again.");
    }
    setImportBusy(false);
  };

  const saveDials = async (dials: CastleSiegeDials) => {
    await updateCastleSiegeSetup(session.id, { dials });
  };

  const lockFairSplit = async (patch: FairSplitLockPatch) => {
    await updateCastleSiegeSetup(session.id, patch);
  };

  const fairSplitActive = session.setupMode === "fairSplit";
  const fairSplitArena = session.arena?.polygon ?? session.gameArea;
  const fairSplitSealsReady = Boolean(sealA && sealB);
  const beltWidthMeters = session.dials?.beltWidthMeters ?? 200;

  return (
    <aside
      aria-label="Castle Siege setup"
      data-testid="castle-siege-setup-chrome"
      className="pointer-events-auto absolute left-3 right-3 z-[var(--z-dock)] flex max-h-[min(52vh,28rem)] flex-col gap-2 overflow-y-auto"
      style={{ top: "max(4.5rem, calc(env(safe-area-inset-top, 0px) + 3.75rem))" }}
    >
      <ArenaLedger arena={session.arena} setupMode={session.setupMode} dials={session.dials} />

      {isHost ? (
        <div
          className="rounded-md border px-3 py-2"
          style={{
            borderColor: "var(--color-rule)",
            background: "oklch(from var(--color-canvas) l c h / 92%)",
          }}
        >
          <EntryAsyncButton
            type="button"
            busy={importBusy}
            unavailable={Boolean(session.arena)}
            idleLabel={session.arena ? "Arena imported" : "Import arena from game area"}
            busyLabel="Importing…"
            fullWidth
            onClick={() => void importArenaFromGameArea()}
          />
          {importError ? (
            <p className="m-0 mt-2 text-xs" style={{ color: "var(--color-halt)" }} role="alert">
              {importError}
            </p>
          ) : null}
        </div>
      ) : null}

      {isHost ? <MusterDials dials={session.dials} onSave={saveDials} /> : null}

      {playing && uid && (role === "teamA" || role === "teamB") ? (
        <SealVault
          sessionId={session.id}
          teamId={role}
          sealedByUid={uid}
          sealPosition={sealPosition}
        />
      ) : null}

      {fairSplitActive && fairSplitSealsReady && sealA && sealB ? (
        <FairSplitProposal
          arena={fairSplitArena}
          sealA={sealA}
          sealB={sealB}
          beltWidthMeters={beltWidthMeters}
          isHost={isHost}
          alreadyLocked={Boolean(session.border && session.neutralBelt)}
          onLock={lockFairSplit}
        />
      ) : null}

      {fairSplitActive && !fairSplitSealsReady ? (
        <p
          className="m-0 rounded-md border px-3 py-2 text-sm"
          role="status"
          data-testid="castle-siege-fair-split-awaiting-seals"
          style={{
            borderColor: "var(--color-rule)",
            background: "oklch(from var(--color-canvas) l c h / 92%)",
            color: "var(--color-field-ink-muted)",
          }}
        >
          Fair-split waits for both castle seals on the map before propose or lock.
        </p>
      ) : null}
    </aside>
  );
}
