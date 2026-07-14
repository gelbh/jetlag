import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LOCAL_SESSION_ID,
  foundHiderBlocked,
  isEndGameActive,
  isEndGamePending,
  isFoundHiderPending,
  type SessionRecord,
} from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import {
  advancedSettingsFromSession,
  mergeSessionRulesPatch,
  sessionRulesPatchFromAdvancedSettings,
  type AdvancedSessionSettingsValue,
} from "../../domain/session/advancedSessionSettings";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import type { PlayerRole } from "../../domain/session/playerRole";
import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  confirmFoundHiderSession,
  requestEndGameSession,
  requestFoundHiderSession,
  resetEndGameSession,
  resetFoundHiderSession,
  updateSessionRules,
} from "../../services/firestore/firestoreAnnotations";

interface UseMapSessionActionsParams {
  session: SessionRecord | null;
  setSession: (session: SessionRecord | null, myUid?: string | null) => void;
  uid: string | null;
  myRole: PlayerRole | null;
  isRemote: boolean;
  gameRulesEditable: boolean;
  timerHasStarted: boolean;
  hidingZones: readonly HidingZoneRecord[];
}

/** Host/session-level actions: end game, advanced rules, and distance unit. */
export function useMapSessionActions({
  session,
  setSession,
  uid,
  myRole,
  isRemote,
  gameRulesEditable,
  timerHasStarted,
  hidingZones,
}: UseMapSessionActionsParams) {
  const [draftAdvancedSettings, setDraftAdvancedSettings] =
    useState<AdvancedSessionSettingsValue | null>(() =>
      session ? advancedSettingsFromSession(session) : null,
    );
  const currentSessionId = session?.id ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset draft when switching sessions only
    setDraftAdvancedSettings(
      session ? advancedSettingsFromSession(session) : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset draft when switching sessions only
  }, [currentSessionId]);

  const confirmedHidingZones = useMemo(
    () => hidingZones.filter((zone) => zone.status === "confirmed"),
    [hidingZones],
  );
  const endGameBlocked = isEndGameActive(session) || isEndGamePending(session);
  const canStartEndGame =
    myRole !== "hider" &&
    timerHasStarted &&
    !isEndGameActive(session) &&
    !isEndGamePending(session) &&
    !foundHiderBlocked(session) &&
    confirmedHidingZones.length > 0;
  const canRequestFoundHider =
    myRole !== "hider" &&
    timerHasStarted &&
    !foundHiderBlocked(session) &&
    !isEndGamePending(session) &&
    confirmedHidingZones.length > 0;

  const handleStartEndGame = useCallback(async () => {
    if (!session?.id || !uid || !canStartEndGame) {
      return;
    }

    const confirmed = window.confirm(
      "Start end game?\n\nConfirm seekers have entered the hiding zone and left transit. Map will show only the hiding zone circle; hider must stay at one spot until found.",
    );
    if (!confirmed) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          endGameRequestedAt: new Date().toISOString(),
          endGameRequestedByUid: uid,
        },
        uid,
      );
      return;
    }

    await requestEndGameSession(session.id, uid);
  }, [canStartEndGame, session, setSession, uid]);

  const handleRequestFoundHider = useCallback(async () => {
    if (!session?.id || !uid || !canRequestFoundHider) {
      return;
    }

    const confirmed = window.confirm(
      "Declare found hider?\n\nThe hider must confirm before the round ends.",
    );
    if (!confirmed) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          foundRequestedAt: new Date().toISOString(),
          foundRequestedByUid: uid,
        },
        uid,
      );
      return;
    }

    await requestFoundHiderSession(session.id, uid);
  }, [canRequestFoundHider, session, setSession, uid]);

  const handleConfirmFoundHider = useCallback(async () => {
    if (!session?.id || !uid || !isFoundHiderPending(session)) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          foundConfirmedAt: new Date().toISOString(),
          foundConfirmedByUid: uid,
          gameOutcome: "found",
          foundRequestedAt: undefined,
          foundRequestedByUid: undefined,
          endGameStartedAt: undefined,
          endGameStartedByUid: undefined,
          endGameRequestedAt: undefined,
          endGameRequestedByUid: undefined,
        },
        uid,
      );
      return;
    }

    await confirmFoundHiderSession(session.id, uid);
  }, [session, setSession, uid]);

  const handleDeclineFoundHider = useCallback(async () => {
    if (!session?.id || !uid) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          foundRequestedAt: undefined,
          foundRequestedByUid: undefined,
        },
        uid,
      );
      return;
    }

    setSession(
      {
        ...session,
        foundRequestedAt: undefined,
        foundRequestedByUid: undefined,
      },
      uid,
    );
    await resetFoundHiderSession(session.id);
  }, [session, setSession, uid]);

  const handleResetEndGame = useCallback(async () => {
    if (!session?.id || !uid) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          endGameStartedAt: undefined,
          endGameStartedByUid: undefined,
          endGameRequestedAt: undefined,
          endGameRequestedByUid: undefined,
        },
        uid,
      );
      return;
    }

    setSession(
      {
        ...session,
        endGameStartedAt: undefined,
        endGameStartedByUid: undefined,
        endGameRequestedAt: undefined,
        endGameRequestedByUid: undefined,
      },
      uid,
    );
    await resetEndGameSession(session.id);
  }, [session, setSession, uid]);

  const handleSaveGameRules = useCallback(async () => {
    if (!session || !draftAdvancedSettings || !gameRulesEditable) {
      return;
    }

    const gameSize = session.gameSize ?? "medium";
    const patch = sessionRulesPatchFromAdvancedSettings(
      gameSize,
      draftAdvancedSettings,
      session.distanceUnit ?? "imperial",
    );
    const merged = mergeSessionRulesPatch(session, patch);

    if (session.id !== LOCAL_SESSION_ID && isRemote) {
      await updateSessionRules(session.id, {
        ...patch,
        hidingZoneRadiusMeters: merged.hidingZoneRadiusMeters,
      });
    }

    setSession(merged, uid ?? undefined);
  }, [
    draftAdvancedSettings,
    gameRulesEditable,
    isRemote,
    session,
    setSession,
    uid,
  ]);

  const handleDistanceUnitChange = useCallback(
    async (unit: DistanceUnit) => {
      if (!session || !gameRulesEditable) {
        return;
      }

      const merged = { ...session, distanceUnit: unit };
      if (session.id !== LOCAL_SESSION_ID && isRemote) {
        await updateSessionRules(session.id, { distanceUnit: unit });
      }
      setSession(merged, uid ?? undefined);
    },
    [gameRulesEditable, isRemote, session, setSession, uid],
  );

  return {
    draftAdvancedSettings,
    setDraftAdvancedSettings,
    confirmedHidingZones,
    endGameBlocked,
    canStartEndGame,
    canRequestFoundHider,
    handleStartEndGame,
    handleRequestFoundHider,
    handleConfirmFoundHider,
    handleDeclineFoundHider,
    handleResetEndGame,
    handleSaveGameRules,
    handleDistanceUnitChange,
  };
}
