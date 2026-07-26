export {
  assertNoNestedArrays,
  deserializeGameAreaFromFirestore,
  serializeGameAreaForFirestore,
  stripUndefinedValues,
  type FirestoreGameArea,
} from "./shared";

export {
  buildAnnotationDocument,
  deserializeAnnotationFromFirestore,
  serializeAnnotationForFirestore,
} from "./serializeAnnotation";

export {
  buildHidingZoneDocument,
  buildSessionDocument,
  buildTimeTrapDocument,
  deserializeHidingZoneFromFirestore,
  deserializeSessionFromFirestore,
  deserializeTimeTrapFromFirestore,
  sessionRulesPatchToFirestore,
} from "./serializeSession";

export {
  buildPendingQuestionDocument,
  buildPlayerLocationDocument,
  buildSessionMessageDocument,
  deserializeGameResultFromFirestore,
  deserializePendingQuestionFromFirestore,
  deserializePlayerLocationFromFirestore,
  deserializeSessionMessageFromFirestore,
} from "./serializePlayer";
