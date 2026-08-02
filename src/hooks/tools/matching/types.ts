import type { GameArea } from "../../../domain/map/annotations";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type { DistanceUnit } from "../../../domain/map/distance";
import type { PendingQuestionRecord } from "../../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/rules";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";

export interface UseMatchingToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  sessionRules?: SessionRulesInput;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  gpsLoading: boolean;
  gpsError?: string | null;
  mapError: string | null;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  canSubmitQuestion?: boolean;
  endGameActive?: boolean;
}

export interface MatchingSessionConfig {
  ready: true;
}
