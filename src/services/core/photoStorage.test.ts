import { FirebaseError } from "firebase/app";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  compressPhotoForUpload,
  deletePhotoAnswer,
  getPhotoDownloadUrl,
  photoAnswerStoragePath,
  resolveImageMimeType,
  uploadPhotoAnswer,
} from "./photoStorage";

vi.mock("firebase/storage", () => ({
  deleteObject: vi.fn(),
  getDownloadURL: vi.fn(),
  ref: vi.fn((_storage, path: string) => ({ path })),
  uploadBytes: vi.fn(),
}));

vi.mock("./firebase", () => ({
  ensureAnonymousUser: vi.fn().mockResolvedValue({ uid: "hider-1" }),
  getFirebaseStorage: vi.fn(() => ({ bucket: "demo" })),
}));

vi.mock("./sentry", () => ({
  addPhotoUploadBreadcrumb: vi.fn(),
  capturePhotoUploadFailure: vi.fn(),
}));

const joinRemoteSessionByCode = vi.fn();

vi.mock("../firestore/firestoreAnnotations", () => ({
  getRemoteSessionById: vi.fn().mockResolvedValue({
    id: "session-1",
    code: "ABCD",
    memberUids: ["hider-1"],
    memberRoles: { "hider-1": "hider" },
  }),
  joinRemoteSessionByCode: (...args: unknown[]) => joinRemoteSessionByCode(...args),
}));

import { deleteObject, getDownloadURL, uploadBytes } from "firebase/storage";

function withMockImage(
  width: number,
  height: number,
  run: () => Promise<void> | void,
) {
  const originalImage = globalThis.Image;
  class MockImage {
    naturalWidth = width;
    naturalHeight = height;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      this.onload?.();
    }
  }
  globalThis.Image = MockImage as unknown as typeof Image;
  return Promise.resolve(run()).finally(() => {
    globalThis.Image = originalImage;
  });
}

describe("photoStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinRemoteSessionByCode.mockResolvedValue({
      status: "joined",
      session: {
        id: "session-1",
        code: "ABCD",
        memberUids: ["hider-1"],
        memberRoles: { "hider-1": "hider" },
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
      type,
    ) {
      callback?.(new Blob(["jpeg"], { type: type ?? "image/jpeg" }));
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("builds storage paths for photo answers", () => {
    expect(
      photoAnswerStoragePath("session-1", "question-1", "photo.jpg"),
    ).toBe("sessions/session-1/photoAnswers/question-1/photo.jpg");
  });

  it("resolves MIME types from extensions when file.type is empty", () => {
    expect(
      resolveImageMimeType(new File(["image"], "photo.heic", { type: "" })),
    ).toBe("image/heic");
    expect(
      resolveImageMimeType(new File(["image"], "photo.jpg", { type: "" })),
    ).toBe("image/jpeg");
  });

  it("rejects non-image files during compression", async () => {
    await expect(
      compressPhotoForUpload(new File(["text"], "notes.txt", { type: "text/plain" })),
    ).rejects.toThrow("Please choose an image file.");
  });

  it("compresses image files for upload", async () => {
    await withMockImage(4000, 3000, async () => {
      const blob = await compressPhotoForUpload(
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
      );
      expect(blob.type).toBe("image/jpeg");
    });
  });

  it("compresses files with empty MIME from the gallery picker", async () => {
    await withMockImage(800, 600, async () => {
      const blob = await compressPhotoForUpload(
        new File(["image"], "photo.jpg", { type: "" }),
      );
      expect(blob.type).toBe("image/jpeg");
    });
  });

  it("uploads compressed photos and returns the storage path", async () => {
    vi.mocked(uploadBytes).mockResolvedValue({} as never);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    await withMockImage(800, 600, async () => {
      const path = await uploadPhotoAnswer(
        "session-1",
        "question-1",
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
        {
          id: "session-1",
          code: "ABCD",
          memberUids: ["hider-1"],
          memberRoles: { "hider-1": "hider" },
        },
        "hider-1",
      );

      expect(path).toBe(
        "sessions/session-1/photoAnswers/question-1/1700000000000.jpg",
      );
      expect(uploadBytes).toHaveBeenCalledOnce();
    });

    vi.mocked(Date.now).mockRestore();
  });

  it("heals membership as hider and retries after storage/unauthorized", async () => {
    const unauthorized = new FirebaseError(
      "storage/unauthorized",
      "User does not have permission.",
    );
    vi.mocked(uploadBytes)
      .mockRejectedValueOnce(unauthorized)
      .mockResolvedValueOnce({} as never);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    await withMockImage(800, 600, async () => {
      const path = await uploadPhotoAnswer(
        "session-1",
        "question-1",
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
        {
          id: "session-1",
          code: "ABCD",
          memberUids: ["hider-1"],
          memberRoles: { "hider-1": "hider" },
        },
        "hider-1",
      );

      expect(path).toBe(
        "sessions/session-1/photoAnswers/question-1/1700000000000.jpg",
      );
      expect(joinRemoteSessionByCode).toHaveBeenCalledWith(
        "ABCD",
        "hider-1",
        "hider",
      );
      expect(uploadBytes).toHaveBeenCalledTimes(2);
    });

    vi.mocked(Date.now).mockRestore();
  });

  it("deletes stored photo answers", async () => {
    vi.mocked(deleteObject).mockResolvedValue(undefined as never);

    await deletePhotoAnswer(
      "sessions/session-1/photoAnswers/question-1/1700000000000.jpg",
    );

    expect(deleteObject).toHaveBeenCalledOnce();
  });

  it("resolves download URLs for stored photos", async () => {
    vi.mocked(getDownloadURL).mockResolvedValue("https://example.com/photo.jpg");

    await expect(
      getPhotoDownloadUrl("sessions/session-1/photoAnswers/question-1/photo.jpg"),
    ).resolves.toBe("https://example.com/photo.jpg");
  });
});
