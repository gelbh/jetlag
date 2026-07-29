import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type { DistanceUnit } from "../../../domain/map/distance";
import {
  isLocalThermometerWalkId,
  thermometerQuestionPrompt,
} from "../../../domain/questions";
import { hotterColderAnswerOptions } from "../../../components/tools/shared/answers/binaryAnswerOptions";
import { emitThermometerWalkSeparatedActivity } from "../../../services/session/emitSessionActivity";
import type { ThermometerSessionConfig } from "./types";

export interface CompleteThermometerWalkLocalInput {
  endPoint: LatLngTuple;
  thermoA: LatLngTuple;
  walkingQuestionId: string;
  distanceMeters: number;
  distanceUnit: DistanceUnit;
  sessionId?: string;
  senderUid?: string | null;
  cardDraw: number;
  cardKeep: number;
  completeThermometerWalk?: (input: {
    pendingQuestionId: string;
    startPoint: LatLngTuple;
    endPoint: LatLngTuple;
    distanceMeters: number;
    promptText: string;
    replyOptions: { id: string; label: string }[];
    cardDraw?: number;
    cardKeep?: number;
  }) => Promise<void>;
  patchConfig: (patch: Partial<ThermometerSessionConfig>) => void;
  onRemoteSuccess: () => void;
}

export async function completeThermometerWalkStep(
  input: CompleteThermometerWalkLocalInput,
): Promise<void> {
  const {
    endPoint,
    thermoA,
    walkingQuestionId,
    distanceMeters,
    distanceUnit,
    sessionId,
    senderUid,
    cardDraw,
    cardKeep,
    completeThermometerWalk,
    patchConfig,
    onRemoteSuccess,
  } = input;

  if (isLocalThermometerWalkId(walkingQuestionId)) {
    patchConfig({
      thermoB: endPoint,
      localWalkingQuestionId: null,
      panelError: null,
    });
    if (sessionId) {
      emitThermometerWalkSeparatedActivity({
        sessionId,
        pendingQuestionId: walkingQuestionId,
        promptText: thermometerQuestionPrompt(distanceMeters, distanceUnit),
        createdByUid: senderUid ?? undefined,
      });
    }
    return;
  }

  if (!completeThermometerWalk) {
    patchConfig({
      panelError: "Walk finished but couldn't save. Try again.",
    });
    return;
  }

  const promptText = thermometerQuestionPrompt(distanceMeters, distanceUnit);

  try {
    await completeThermometerWalk({
      pendingQuestionId: walkingQuestionId,
      startPoint: thermoA,
      endPoint,
      distanceMeters,
      promptText,
      replyOptions: hotterColderAnswerOptions.map((option) => ({
        id: option.value,
        label: option.label,
      })),
      cardDraw,
      cardKeep,
    });
  } catch (error) {
    patchConfig({
      panelError:
        error instanceof Error
          ? error.message
          : "Thermometer walk could not finish. Try again.",
    });
    return;
  }

  patchConfig({
    localWalkingQuestionId: null,
    localThermoA: null,
    thermoB: null,
  });
  onRemoteSuccess();
}
