import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase/firebase";

export type AdminBoardOpsAction =
  | "listAnnotations"
  | "softDeleteAnnotation"
  | "restoreAnnotation"
  | "recomputeThermometerFromHide";

export interface AdminBoardAnnotationSummary {
  id: string;
  type: string;
  status: string;
  createdAt: string | null;
  answerSummary: string | null;
  hotterTowards: string | null;
  radiusMeters: number | null;
}

interface AdminSessionBoardOpsRequest {
  sessionId: string;
  action: AdminBoardOpsAction;
  annotationId?: string;
}

interface ListAnnotationsResponse {
  annotations: AdminBoardAnnotationSummary[];
}

interface MutateAnnotationResponse {
  ok: true;
  annotationId: string;
  status: string;
  thermometerAnswer?: string;
  hotterTowards?: string;
}

export async function adminListBoardAnnotations(
  sessionId: string,
): Promise<AdminBoardAnnotationSummary[]> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<AdminSessionBoardOpsRequest, ListAnnotationsResponse>(
    functions,
    "adminSessionBoardOps",
  );

  const result = await callable({ sessionId, action: "listAnnotations" });
  return result.data.annotations ?? [];
}

export async function adminSessionBoardOps(
  sessionId: string,
  action: Exclude<AdminBoardOpsAction, "listAnnotations">,
  annotationId: string,
): Promise<MutateAnnotationResponse> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<AdminSessionBoardOpsRequest, MutateAnnotationResponse>(
    functions,
    "adminSessionBoardOps",
  );

  const result = await callable({ sessionId, action, annotationId });
  return result.data;
}
