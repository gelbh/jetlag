import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import type {
  IncidentDiagnostics,
  IncidentMitigationType,
  IncidentStatus,
} from "../../domain/incident/incidentTypes";
import type { PlayerRole } from "../../domain/session/playerRole";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";

function mapCallableError(error: unknown, fallback: string): Error {
  if (error instanceof FirebaseError) {
    const raw = error.message?.trim();
    const message = !raw || raw === "INTERNAL" ? fallback : raw;
    return new Error(message, { cause: error });
  }

  return error instanceof Error ? error : new Error(fallback);
}

function requireFirebase(): void {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }
}

export interface CreateIncidentInput {
  diagnostics: IncidentDiagnostics;
  playerNote?: string | null;
  reporterRole?: PlayerRole | null;
}

export interface CreateIncidentResult {
  incidentId: string;
  status: IncidentStatus;
}

export async function createIncident(
  input: CreateIncidentInput,
): Promise<CreateIncidentResult> {
  requireFirebase();

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    {
      diagnostics: IncidentDiagnostics;
      playerNote?: string | null;
      reporterRole?: PlayerRole | null;
    },
    CreateIncidentResult
  >(functions, "createIncident");

  try {
    const result = await callable({
      diagnostics: input.diagnostics,
      playerNote: input.playerNote ?? null,
      reporterRole: input.reporterRole ?? null,
    });
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not submit the report.");
  }
}

export interface PostIncidentMessageResult {
  messageId: string;
}

export async function postIncidentMessage(
  incidentId: string,
  text: string,
): Promise<PostIncidentMessageResult> {
  requireFirebase();

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { incidentId: string; text: string },
    PostIncidentMessageResult
  >(functions, "postIncidentMessage");

  try {
    const result = await callable({ incidentId, text });
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not send the message.");
  }
}

export interface ApplyIncidentMitigationResult {
  mitigationId: string;
  type: IncidentMitigationType;
}

export async function applyIncidentMitigation(
  incidentId: string,
  type: IncidentMitigationType,
  note?: string | null,
): Promise<ApplyIncidentMitigationResult> {
  requireFirebase();

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { incidentId: string; type: IncidentMitigationType; note?: string | null },
    ApplyIncidentMitigationResult
  >(functions, "applyIncidentMitigation");

  try {
    const result = await callable({
      incidentId,
      type,
      note: note ?? null,
    });
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not apply the mitigation.");
  }
}

export interface PublishIncidentHotfixResult {
  toVersion: string;
  graceSeconds: number;
  fannedOutSessionCount: number;
}

export async function publishIncidentHotfix(
  incidentId: string,
  toVersion: string,
  graceSeconds?: number,
): Promise<PublishIncidentHotfixResult> {
  requireFirebase();

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { incidentId: string; toVersion: string; graceSeconds?: number },
    PublishIncidentHotfixResult
  >(functions, "publishIncidentHotfix");

  try {
    const result = await callable({
      incidentId,
      toVersion,
      ...(typeof graceSeconds === "number" ? { graceSeconds } : {}),
    });
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not publish the hotfix.");
  }
}
