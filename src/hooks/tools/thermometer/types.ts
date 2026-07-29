import type { AnnotationRecord } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type { DistanceUnit } from "../../../domain/map/distance";
import type { ThermometerAnswer } from "../../../domain/questions";
import type { PendingQuestionRecord } from "../../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/rules";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import type { GeolocationReading } from "../../../services/core/geolocation";

export type ThermometerPlacementMode = "gps" | "manual";

export interface ThermometerSessionConfig {
  placementMode: ThermometerPlacementMode;
  localThermoA: LatLngTuple | null;
  thermoB: LatLngTuple | null;
  localWalkingQuestionId: string | null;
  distanceMeters: number;
  answer: ThermometerAnswer | null;
  panelError: string | null;
}

export interface UseThermometerToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  sessionRules: SessionRulesInput;
  pendingQuestions?: readonly PendingQuestionRecord[];
  canSubmitQuestion?: boolean;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<string | void>;
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
  sessionId?: string;
  senderUid?: string | null;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  setMapError: (message: string | null) => void;
  gpsLoading?: boolean;
  gpsError?: string | null;
  refreshGps?: () => Promise<GeolocationReading>;
  ensurePointInGameArea?: (point: LatLngTuple) => boolean;
}
