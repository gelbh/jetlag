import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  compressPhotoForUpload,
  getPhotoDownloadUrl,
  photoAnswerStoragePath,
  uploadPhotoAnswer,
} from "./photoStorage";

vi.mock("firebase/storage", () => ({
  getDownloadURL: vi.fn(),
  ref: vi.fn((_storage, path: string) => ({ path })),
  uploadBytes: vi.fn(),
}));

vi.mock("./firebase", () => ({
  getFirebaseStorage: vi.fn(() => ({ bucket: "demo" })),
}));

import { getDownloadURL, uploadBytes } from "firebase/storage";

describe("photoStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("rejects non-image files during compression", async () => {
    await expect(
      compressPhotoForUpload(new File(["text"], "notes.txt", { type: "text/plain" })),
    ).rejects.toThrow("Please choose an image file.");
  });

  it("compresses image files for upload", async () => {
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    const originalImage = globalThis.Image;
    class MockImage {
      naturalWidth = 4000;
      naturalHeight = 3000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    try {
      const blob = await compressPhotoForUpload(file);
      expect(blob.type).toBe("image/jpeg");
    } finally {
      globalThis.Image = originalImage;
    }
  });

  it("uploads compressed photos and returns the storage path", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
    ) {
      callback?.(new Blob(["jpeg"], { type: "image/jpeg" }));
    });
    const originalImage = globalThis.Image;
    class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;
    vi.mocked(uploadBytes).mockResolvedValue({} as never);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    try {
      const path = await uploadPhotoAnswer(
        "session-1",
        "question-1",
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
      );

      expect(path).toBe(
        "sessions/session-1/photoAnswers/question-1/1700000000000.jpg",
      );
      expect(uploadBytes).toHaveBeenCalledOnce();
    } finally {
      globalThis.Image = originalImage;
      vi.mocked(Date.now).mockRestore();
    }
  });

  it("resolves download URLs for stored photos", async () => {
    vi.mocked(getDownloadURL).mockResolvedValue("https://example.com/photo.jpg");

    await expect(
      getPhotoDownloadUrl("sessions/session-1/photoAnswers/question-1/photo.jpg"),
    ).resolves.toBe("https://example.com/photo.jpg");
  });
});
