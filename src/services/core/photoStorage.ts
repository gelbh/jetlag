import {
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";
import type { SessionRecord } from "../domain/annotations";
import {
  formatPhotoStorageError,
  photoUploadAccessError,
} from "../domain/photoUploadAccess";
import { ensureAnonymousUser, getFirebaseStorage } from "./firebase";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const image = await loadImageFromFile(file);
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
    file.type === "image/png" || file.type === "image/webp"
      ? file.type
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

export async function uploadPhotoAnswer(
  sessionId: string,
  questionId: string,
  file: File,
  session?: Pick<SessionRecord, "memberUids" | "memberRoles"> | null,
  myUid?: string | null,
): Promise<string> {
  const accessError = photoUploadAccessError(session, myUid ?? null);
  if (accessError) {
    throw new Error(accessError);
  }

  if (!myUid) {
    await ensureAnonymousUser();
  }

  const blob = await compressPhotoForUpload(file);
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

  try {
    await uploadBytes(storageRef, blob, metadata);
  } catch (error) {
    throw new Error(formatPhotoStorageError(error), { cause: error });
  }

  return storagePath;
}

export async function getPhotoDownloadUrl(storagePath: string): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), storagePath);
  return getDownloadURL(storageRef);
}
