import { FirebaseError } from "firebase/app";
import {
  deleteObject,
  getDownloadURL,
  ref,
  type UploadMetadata,
  uploadBytesResumable,
} from "firebase/storage";
import type { SessionRecord } from "@/domain/map/annotations";
import type { ProgressNode, StageSpec } from "@/domain/progress/progressTree";
import {
  formatPhotoStorageError,
  isStorageUnauthorized,
  photoUploadAccessError,
  photoUploadServerDiagnostics,
} from "@/domain/questions";
import { ensureHiderPhotoUploadAccess } from "../../firestore/firestoreAnnotations";
import { capturePhotoUploadFailure } from "../analytics/clientErrors";
import { ensureAnonymousUser, getFirebaseStorage } from "../firebase/firebase";
import { throwIfAborted } from "../network/anySignal";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const RETRY_DELAYS_MS = [500, 1500] as const;

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
};

const COMPRESS_STAGE: StageSpec = {
  kind: "compute",
  label: "Compressing photo",
  historyKey: "photo:compress",
};

const UPLOAD_STAGE: StageSpec = {
  kind: "fetch",
  label: "Uploading photo",
  historyKey: "photo:upload",
};

export interface UploadPhotoAnswerOptions {
  /** Parent stage; gets a compress stage and a byte-counted upload stage. */
  progress?: ProgressNode;
  /** Cancels the running upload. */
  signal?: AbortSignal;
}

const UNSUPPORTED_FORMAT_MESSAGE =
  "This photo format isn't supported. Try choosing a JPEG from your gallery.";

function fileExtension(file: File): string | null {
  const parts = file.name.split(".");
  if (parts.length < 2) {
    return null;
  }
  return parts.at(-1)?.toLowerCase() ?? null;
}

function isHeicLike(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") {
    return true;
  }
  const ext = fileExtension(file);
  return ext === "heic" || ext === "heif";
}

export function resolveImageMimeType(file: File): string | null {
  if (file.type.startsWith("image/")) {
    return file.type;
  }

  const ext = fileExtension(file);
  if (ext && EXTENSION_MIME[ext]) {
    return EXTENSION_MIME[ext];
  }

  if (file.type === "") {
    return "image/jpeg";
  }

  return null;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the selected image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress the selected image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function compressPhotoForUpload(file: File): Promise<Blob> {
  const resolvedType = resolveImageMimeType(file);
  if (!resolvedType) {
    throw new Error("Please choose an image file.");
  }

  let image: HTMLImageElement;
  try {
    image = await loadImageFromFile(file);
  } catch (error) {
    if (isHeicLike(file)) {
      throw new Error(UNSUPPORTED_FORMAT_MESSAGE, { cause: error });
    }
    throw error;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the image for upload.");
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType =
    resolvedType === "image/png" || resolvedType === "image/webp" ? resolvedType : "image/jpeg";
  const blob = await canvasToBlob(canvas, outputType, JPEG_QUALITY);

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo is too large after compression. Try a smaller image.");
  }

  return blob;
}

export function photoAnswerStoragePath(
  sessionId: string,
  questionId: string,
  fileName: string,
): string {
  return `sessions/${sessionId}/photoAnswers/${questionId}/${fileName}`;
}

async function attemptUpload(
  storageRef: ReturnType<typeof ref>,
  blob: Blob,
  metadata: UploadMetadata,
  node: ProgressNode | undefined,
  signal: AbortSignal | undefined,
): Promise<void> {
  const upload = uploadBytesResumable(storageRef, blob, metadata);
  const cancel = () => upload.cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  upload.on("state_changed", (snapshot) => {
    node?.setCount(snapshot.bytesTransferred, snapshot.totalBytes);
  });
  try {
    await upload;
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}

export async function deletePhotoAnswer(storagePath: string): Promise<void> {
  const storageRef = ref(await getFirebaseStorage(), storagePath);
  await deleteObject(storageRef);
}

export async function uploadPhotoAnswer(
  sessionId: string,
  questionId: string,
  file: File,
  session?: Pick<SessionRecord, "id" | "code" | "memberUids" | "memberRoles"> | null,
  myUid?: string | null,
  options: UploadPhotoAnswerOptions = {},
): Promise<string> {
  const { progress, signal } = options;
  const compressNode = progress?.stage(COMPRESS_STAGE);
  const uploadNode = progress?.stage(UPLOAD_STAGE);
  const user = await ensureAnonymousUser();
  const authUid = user.uid;
  await user.getIdToken(true);

  if (!session?.id || !session.code) {
    throw new Error("Syncing session… Try again in a moment.");
  }

  let activeSession = await ensureHiderPhotoUploadAccess(session, authUid, myUid);

  let blob: Blob;
  try {
    compressNode?.start();
    blob = await compressPhotoForUpload(file);
    compressNode?.finish();
  } catch (error) {
    capturePhotoUploadFailure(error, "compress", {
      fileType: file.type || null,
      fileSize: file.size,
      sessionId,
      questionId,
    });
    throw error;
  }

  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}.${extension}`;
  const storagePath = photoAnswerStoragePath(sessionId, questionId, fileName);
  const storageRef = ref(await getFirebaseStorage(), storagePath);
  const metadata: UploadMetadata = {
    contentType: blob.type.startsWith("image/") ? blob.type : "image/jpeg",
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      throwIfAborted(signal);
      uploadNode?.start();
      await attemptUpload(storageRef, blob, metadata, uploadNode, signal);
      uploadNode?.finish();
      return storagePath;
    } catch (error) {
      // A cancelled upload is not a failure worth reporting.
      throwIfAborted(signal);
      lastError = error;

      if (!isStorageUnauthorized(error) || attempt >= RETRY_DELAYS_MS.length) {
        break;
      }

      try {
        activeSession = await ensureHiderPhotoUploadAccess(activeSession, authUid, myUid);
      } catch {
        break;
      }

      const retryAccessError = photoUploadAccessError(activeSession, authUid);
      if (retryAccessError) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  const failureDiagnostics = photoUploadServerDiagnostics(activeSession, authUid);

  capturePhotoUploadFailure(lastError, "storage", {
    sessionId,
    questionId,
    memberRole: activeSession.memberRoles?.[authUid] ?? null,
    serverMemberRole: failureDiagnostics.serverMemberRole,
    authUidMatchesServerHider: failureDiagnostics.authUidMatchesServerHider,
    attempts: RETRY_DELAYS_MS.length + 1,
    code: lastError instanceof FirebaseError ? lastError.code : undefined,
  });

  throw new Error(formatPhotoStorageError(lastError, activeSession, authUid), { cause: lastError });
}

export async function getPhotoDownloadUrl(storagePath: string): Promise<string> {
  const storageRef = ref(await getFirebaseStorage(), storagePath);
  return getDownloadURL(storageRef);
}
