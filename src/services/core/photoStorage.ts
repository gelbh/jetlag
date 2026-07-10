import { FirebaseError } from "firebase/app";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";
import type { SessionRecord } from "../../domain/map/annotations";
import {
  formatPhotoStorageError,
  isStorageUnauthorized,
  photoUploadAccessError,
} from "../../domain/questions/photoUploadAccess";
import {
  getRemoteSessionById,
  joinRemoteSessionByCode,
} from "../firestore/firestoreAnnotations";
import { ensureAnonymousUser, getFirebaseStorage } from "./firebase";
import {
  addPhotoUploadBreadcrumb,
  capturePhotoUploadFailure,
} from "./sentry";

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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
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

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  );
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
    resolvedType === "image/png" || resolvedType === "image/webp"
      ? resolvedType
      : "image/jpeg";
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

async function healSessionMembership(
  session: Pick<SessionRecord, "id" | "code">,
  authUid: string,
): Promise<SessionRecord | null> {
  const healed = await joinRemoteSessionByCode(session.code, authUid, "hider");
  if (healed.status === "joined") {
    return healed.session;
  }
  return getRemoteSessionById(session.id);
}

async function attemptUpload(
  storageRef: ReturnType<typeof ref>,
  blob: Blob,
  metadata: UploadMetadata,
): Promise<void> {
  await uploadBytes(storageRef, blob, metadata);
}

export async function deletePhotoAnswer(storagePath: string): Promise<void> {
  const storageRef = ref(getFirebaseStorage(), storagePath);
  await deleteObject(storageRef);
}

export async function uploadPhotoAnswer(
  sessionId: string,
  questionId: string,
  file: File,
  session?: Pick<
    SessionRecord,
    "id" | "code" | "memberUids" | "memberRoles"
  > | null,
  myUid?: string | null,
): Promise<string> {
  const user = await ensureAnonymousUser();
  const authUid = user.uid;

  if (myUid && myUid !== authUid) {
    throw new Error(
      "Your sign-in changed. Rejoin the session and try uploading again.",
    );
  }

  let activeSession = session ?? null;
  if (session?.id) {
    const remoteSession = await getRemoteSessionById(session.id);
    if (remoteSession) {
      activeSession = remoteSession;
    }
  }

  const accessError = photoUploadAccessError(activeSession, authUid);
  if (accessError) {
    throw new Error(accessError);
  }

  addPhotoUploadBreadcrumb({
    authUid,
    myUid: myUid ?? null,
    memberUids: activeSession?.memberUids ?? [],
    memberRole: activeSession?.memberRoles?.[authUid] ?? null,
    sessionId,
    questionId,
    fileType: file.type || null,
    fileSize: file.size,
  });

  let blob: Blob;
  try {
    blob = await compressPhotoForUpload(file);
  } catch (error) {
    capturePhotoUploadFailure(error, "compress", {
      fileType: file.type || null,
      fileSize: file.size,
      sessionId,
      questionId,
    });
    throw error;
  }

  const extension =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
        ? "webp"
        : "jpg";
  const fileName = `${Date.now()}.${extension}`;
  const storagePath = photoAnswerStoragePath(sessionId, questionId, fileName);
  const storageRef = ref(getFirebaseStorage(), storagePath);
  const metadata: UploadMetadata = {
    contentType: blob.type,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await attemptUpload(storageRef, blob, metadata);
      return storagePath;
    } catch (error) {
      lastError = error;

      if (!isStorageUnauthorized(error) || attempt >= RETRY_DELAYS_MS.length) {
        break;
      }

      if (activeSession?.code) {
        const healed = await healSessionMembership(activeSession, authUid);
        if (healed) {
          activeSession = healed;
        }
      } else if (session?.id) {
        const refreshed = await getRemoteSessionById(session.id);
        if (refreshed) {
          activeSession = refreshed;
        }
      }

      const retryAccessError = photoUploadAccessError(activeSession, authUid);
      if (retryAccessError) {
        break;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
      );
    }
  }

  capturePhotoUploadFailure(lastError, "storage", {
    sessionId,
    questionId,
    memberRole: activeSession?.memberRoles?.[authUid] ?? null,
    attempts: RETRY_DELAYS_MS.length + 1,
    code:
      lastError instanceof FirebaseError ? lastError.code : undefined,
  });

  throw new Error(
    formatPhotoStorageError(lastError, activeSession, authUid),
    { cause: lastError },
  );
}

export async function getPhotoDownloadUrl(storagePath: string): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), storagePath);
  return getDownloadURL(storageRef);
}
