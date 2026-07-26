import type { LatLngTuple } from "../../../domain/geometry/geometry";
import type { DistanceUnit } from "../../../domain/map/distance";
import {
  hasOpenPendingQuestion,
  isThermometerDistanceOptionAvailableForSession,
  LOCAL_THERMOMETER_WALK_ID,
  thermometerQuestionPrompt,
} from "../../../domain/questions";
import type { PendingQuestionRecord } from "../../../domain/session/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/sessionRules";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import type { GeolocationReading } from "../../../services/core/geolocation";
import { emitThermometerWalkStartedActivity } from "../../../services/session/emitSessionActivity";
import { thermometerWalkStartPlacement } from "../useThermometerWalk";
import type { ThermometerSessionConfig } from "./types";

export interface StartThermometerWalkInput {
  config: ThermometerSessionConfig;
  canSubmitQuestion: boolean;
  pendingQuestions: readonly PendingQuestionRecord[];
  sessionRules: SessionRulesInput;
  gpsReading: GeolocationReading | null;
  refreshGps?: () => Promise<GeolocationReading>;
  ensurePointInGameArea?: (point: LatLngTuple) => boolean;
  awaitHiderAnswer: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<string | void>;
  sessionId?: string;
  senderUid?: string | null;
  distanceUnit: DistanceUnit;
  distanceMeters: number;
  setMapError: (message: string | null) => void;
  patchConfig: (patch: Partial<ThermometerSessionConfig>) => void;
}

export async function startThermometerGpsWalk(
  input: StartThermometerWalkInput,
): Promise<void> {
  const {
    canSubmitQuestion,
    pendingQuestions,
    sessionRules,
    gpsReading,
    refreshGps,
    ensurePointInGameArea,
    awaitHiderAnswer,
    submitPendingQuestion,
    sessionId,
    senderUid,
    distanceUnit,
    distanceMeters,
    setMapError,
    patchConfig,
  } = input;

  patchConfig({ panelError: null });
  setMapError(null);

  if (!canSubmitQuestion || hasOpenPendingQuestion(pendingQuestions)) {
    patchConfig({
      panelError: "Finish the current question before starting another.",
    });
    return;
  }

  if (
    !isThermometerDistanceOptionAvailableForSession(
      sessionRules,
      distanceMeters,
    )
  ) {
    patchConfig({
      panelError: "That distance is not available for this game size.",
    });
    return;
  }

  let reading = gpsReading;
  if (!reading && refreshGps) {
    try {
      reading = await refreshGps();
    } catch (error) {
      patchConfig({
        panelError:
          error instanceof Error ? error.message : "GPS location unavailable.",
      });
      return;
    }
  }

  if (!reading) {
    patchConfig({ panelError: "Waiting for GPS fix…" });
    return;
  }

  const start: LatLngTuple = [reading.lat, reading.lng];
  if (ensurePointInGameArea && !ensurePointInGameArea(start)) {
    patchConfig({ panelError: "That point is outside the play area." });
    return;
  }

  patchConfig({ localThermoA: start, thermoB: null });

  const distanceLabel = thermometerQuestionPrompt(distanceMeters, distanceUnit);

  if (!awaitHiderAnswer) {
    patchConfig({ localWalkingQuestionId: LOCAL_THERMOMETER_WALK_ID });
    if (sessionId) {
      emitThermometerWalkStartedActivity({
        sessionId,
        pendingQuestionId: LOCAL_THERMOMETER_WALK_ID,
        promptText: distanceLabel,
        createdByUid: senderUid ?? undefined,
      });
    }
    return;
  }

  if (!submitPendingQuestion || !sessionId || !senderUid) {
    patchConfig({
      panelError: "Session is still loading. Try again in a moment.",
      localThermoA: null,
    });
    return;
  }

  const startMessage = `Thermometer walk started. ${distanceLabel}`;

  try {
    const questionId = await submitPendingQuestion({
      promptText: startMessage,
      replyOptions: [],
      placement: thermometerWalkStartPlacement(start, distanceMeters),
      status: "walking",
    });

    if (typeof questionId !== "string") {
      patchConfig({
        panelError: "Couldn't start the walk. Try again.",
        localThermoA: null,
      });
      return;
    }

    patchConfig({ localWalkingQuestionId: questionId });
  } catch (error) {
    patchConfig({
      panelError:
        error instanceof Error
          ? error.message
          : "Couldn't start the walk. Try again.",
      localThermoA: null,
    });
  }
}
