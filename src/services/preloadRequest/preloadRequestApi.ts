import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import type {
  PreloadPresetSnapshot,
  PreloadRequestStatus,
} from "../../domain/preloadRequest/preloadRequestTypes";
import {
  getFirebaseFunctions,
  isFirebaseConfigured,
} from "../core/firebase/firebase";

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

export interface CreatePreloadRequestInput {
  presetSnapshot: PreloadPresetSnapshot;
  note?: string | null;
}

export interface CreatePreloadRequestResult {
  requestId: string;
  status: PreloadRequestStatus;
}

export async function createPreloadRequest(
  input: CreatePreloadRequestInput,
): Promise<CreatePreloadRequestResult> {
  requireFirebase();

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    {
      presetSnapshot: PreloadPresetSnapshot;
      note?: string | null;
    },
    CreatePreloadRequestResult
  >(functions, "createPreloadRequest");

  try {
    const result = await callable({
      presetSnapshot: input.presetSnapshot,
      note: input.note ?? null,
    });
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not submit the preload request.");
  }
}

export interface UpdatePreloadRequestStatusResult {
  status: PreloadRequestStatus;
}

export async function updatePreloadRequestStatus(
  requestId: string,
  status: PreloadRequestStatus,
): Promise<UpdatePreloadRequestStatusResult> {
  requireFirebase();

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { requestId: string; status: PreloadRequestStatus },
    UpdatePreloadRequestStatusResult
  >(functions, "updatePreloadRequestStatus");

  try {
    const result = await callable({ requestId, status });
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not update the preload request.");
  }
}
