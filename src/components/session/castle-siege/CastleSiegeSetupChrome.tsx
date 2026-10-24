import { useState } from "react";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { gameAreaCenter } from "@/domain/geometry/gameArea/geometry";
import type { SessionRecord } from "@/domain/map/annotations";
import { arenaFromGameArea } from "@/domain/session/castleSiege/arena";
import { readClientSealWrapKey } from "@/domain/session/castleSiege/clientSealWrapKey";
import { CASTLE_SIEGE_HAND_LIMIT } from "@/domain/session/castleSiege/deck";
import type { CastleSiegeDials } from "@/domain/session/castleSiege/dials";
import type { FairSplitLockPatch } from "@/domain/session/castleSiege/fairSplitLock";
import { isCastleSiegeSession } from "@/domain/session/castleSiege/mode";
import type { CastleSiegeSealPoint } from "@/domain/session/castleSiege/pregame";
import { SEAL_WRAP_KEY_ID_V1 } from "@/domain/session/castleSiege/sealCipher";
import { deserializeSiegeCapture } from "@/domain/session/castleSiege/siegeCapturePersist";
import { deserializeSiegeClock } from "@/domain/session/castleSiege/siegePersist";
import { deserializeTurnState } from "@/domain/session/castleSiege/standoffPersist";
import {
  isCastleSiegePlayingRole,
  resolveCastleSiegeRole,
} from "@/domain/session/castleSiege/teamRole";
import {
  startCastleSiegeStandoff,
  updateCastleSiegeSetup,
} from "@/services/firestore/firestoreSessions";
import { ArenaLedger } from "./ArenaLedger";
import { FairSplitProposal } from "./FairSplitProposal";
import { MusterDials } from "./MusterDials";
import { SealVault } from "./SealVault";
import { SiegeChrome } from "./SiegeChrome";
import { StandoffChrome } from "./StandoffChrome";

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
  const inStandoff = session.phase === "standoff";
  const inSiege = session.phase === "siege";
  const standoffTurn = deserializeTurnState(session.standoffTurn) ?? null;
  const siegeClock = deserializeSiegeClock(session.siegeClock) ?? null;
  const siegeCapture = deserializeSiegeCapture(session.siegeCapture) ?? null;
  const deckRemaining = session.standoffDeckRemainingCount ?? 0;
  // Hand ids live in teamHands/{teamId}; chrome shows 0 until a listener wires (Phase 5.x).
  const ownHandCount = 0;
  const setupPanelsHidden = inStandoff || inSiege;

  const beginStandoff = async () => {
    if (!isHost || importBusy) return;
    setImportBusy(true);
    setImportError(null);
    try {
      await startCastleSiegeStandoff(session.id);
    } catch {
      setImportError("Couldn't start Standoff. Try again.");
    }
    setImportBusy(false);
  };

  return (
    <aside
      aria-label="Castle Siege setup"
      data-testid="castle-siege-setup-chrome"
      className="pointer-events-auto absolute left-3 right-3 z-[var(--z-dock)] flex max-h-[min(52vh,28rem)] flex-col gap-2 overflow-y-auto"
      style={{ top: "max(4.5rem, calc(env(safe-area-inset-top, 0px) + 3.75rem))" }}
    >
      <StandoffChrome
        active={inStandoff}
        turn={standoffTurn}
        deckRemaining={deckRemaining}
        handCount={ownHandCount}
        handLimit={CASTLE_SIEGE_HAND_LIMIT}
        endgameBanner={
          standoffTurn?.lastWordPending ? "lastWord" : standoffTurn?.duskReady ? "dusk" : null
        }
      />

      <SiegeChrome active={inSiege} clock={siegeClock} capture={siegeCapture} />

      {setupPanelsHidden ? null : (
        <ArenaLedger arena={session.arena} setupMode={session.setupMode} dials={session.dials} />
      )}

      {!setupPanelsHidden && isHost ? (
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
          {session.arena ? (
            <div className="mt-2">
              <EntryAsyncButton
                type="button"
                busy={importBusy}
                idleLabel="Start Standoff"
                busyLabel="Starting…"
                fullWidth
                onClick={() => void beginStandoff()}
              />
            </div>
          ) : null}
          {importError ? (
            <p className="m-0 mt-2 text-xs" style={{ color: "var(--color-halt)" }} role="alert">
              {importError}
            </p>
          ) : null}
        </div>
      ) : null}

      {!setupPanelsHidden && isHost ? (
        <MusterDials dials={session.dials} onSave={saveDials} />
      ) : null}

      {!setupPanelsHidden && playing && uid && (role === "teamA" || role === "teamB") ? (
        <SealVault
          sessionId={session.id}
          teamId={role}
          sealedByUid={uid}
          sealPosition={sealPosition}
          wrappingKey={readClientSealWrapKey()}
          wrapKeyId={SEAL_WRAP_KEY_ID_V1}
        />
      ) : null}

      {!setupPanelsHidden && fairSplitActive && fairSplitSealsReady && sealA && sealB ? (
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

      {!setupPanelsHidden && fairSplitActive && !fairSplitSealsReady ? (
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
