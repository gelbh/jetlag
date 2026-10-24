import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  uploadBytesResumable: vi.fn(),
}));

vi.mock("../firebase/firebase", () => ({
  ensureAnonymousUser: vi.fn().mockResolvedValue({
    uid: "hider-1",
    getIdToken: vi.fn().mockResolvedValue("token"),
  }),
  getFirebaseStorage: vi.fn(async () => ({ bucket: "demo" })),
}));

vi.mock("../analytics/clientErrors", () => ({
  capturePhotoUploadFailure: vi.fn(),
}));

const ensureHiderPhotoUploadAccess = vi.fn();

vi.mock("../../firestore/firestoreAnnotations", () => ({
  ensureHiderPhotoUploadAccess: (...args: unknown[]) => ensureHiderPhotoUploadAccess(...args),
}));

import { deleteObject, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { createLoadTask } from "../progress/loadTask";

type UploadSnapshot = { bytesTransferred: number; totalBytes: number };

/** Thenable UploadTask stand-in that reports `steps` before settling with `outcome`. */
function mockUploadTask(outcome: "ok" | Error, steps: UploadSnapshot[] = []) {
  const listeners: Array<(snapshot: UploadSnapshot) => void> = [];
  let rejectUpload: (error: unknown) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    rejectUpload = reject;
    queueMicrotask(() => {
      for (const step of steps) {
        for (const listener of listeners) {
          listener(step);
        }
      }
      if (outcome === "ok") {
        resolve();
      } else {
        reject(outcome);
      }
    });
  });
  return {
    on: vi.fn((_event: string, next: (snapshot: UploadSnapshot) => void) => {
      listeners.push(next);
    }),
    cancel: vi.fn(() => {
      rejectUpload(new FirebaseError("storage/canceled", "User canceled the upload."));
      return true;
    }),
    // biome-ignore lint/suspicious/noThenProperty: Firebase's UploadTask is thenable.
    then: promise.then.bind(promise),
  };
}

const photoFile = () => new File(["image"], "photo.jpg", { type: "image/jpeg" });

const hiderSession = {
  id: "session-1",
  code: "ABCD",
  memberUids: ["hider-1"],
  memberRoles: { "hider-1": "hider" as const },
};

function withMockImage(width: number, height: number, run: () => Promise<void> | void) {
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
    ensureHiderPhotoUploadAccess.mockResolvedValue(hiderSession);
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
    expect(photoAnswerStoragePath("session-1", "question-1", "photo.jpg")).toBe(
      "sessions/session-1/photoAnswers/question-1/photo.jpg",
    );
  });

  it("resolves MIME types from extensions when file.type is empty", () => {
    expect(resolveImageMimeType(new File(["image"], "photo.heic", { type: "" }))).toBe(
      "image/heic",
    );
    expect(resolveImageMimeType(new File(["image"], "photo.jpg", { type: "" }))).toBe("image/jpeg");
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
      const blob = await compressPhotoForUpload(new File(["image"], "photo.jpg", { type: "" }));
      expect(blob.type).toBe("image/jpeg");
    });
  });

  it("confirms hider access from the server before upload", async () => {
    vi.mocked(uploadBytesResumable).mockImplementation(() => mockUploadTask("ok") as never);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    await withMockImage(800, 600, async () => {
      await uploadPhotoAnswer(
        "session-1",
        "question-1",
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
        hiderSession,
        "hider-1",
      );
    });

    expect(ensureHiderPhotoUploadAccess).toHaveBeenCalledWith(hiderSession, "hider-1", "hider-1");
    expect(uploadBytesResumable).toHaveBeenCalledOnce();

    vi.mocked(Date.now).mockRestore();
  });

  it("uploads compressed photos and returns the storage path", async () => {
    vi.mocked(uploadBytesResumable).mockImplementation(() => mockUploadTask("ok") as never);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    await withMockImage(800, 600, async () => {
      const path = await uploadPhotoAnswer(
        "session-1",
        "question-1",
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
        hiderSession,
        "hider-1",
      );

      expect(path).toBe("sessions/session-1/photoAnswers/question-1/1700000000000.jpg");
      expect(uploadBytesResumable).toHaveBeenCalledOnce();
    });

    vi.mocked(Date.now).mockRestore();
  });

  it("re-ensures hider access and retries after storage/unauthorized", async () => {
    const unauthorized = new FirebaseError(
      "storage/unauthorized",
      "User does not have permission.",
    );
    vi.mocked(uploadBytesResumable)
      .mockImplementationOnce(() => mockUploadTask(unauthorized) as never)
      .mockImplementationOnce(() => mockUploadTask("ok") as never);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    await withMockImage(800, 600, async () => {
      const path = await uploadPhotoAnswer(
        "session-1",
        "question-1",
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
        hiderSession,
        "hider-1",
      );

      expect(path).toBe("sessions/session-1/photoAnswers/question-1/1700000000000.jpg");
      expect(ensureHiderPhotoUploadAccess).toHaveBeenCalledTimes(2);
      expect(uploadBytesResumable).toHaveBeenCalledTimes(2);
    });

    vi.mocked(Date.now).mockRestore();
  });

  it("counts uploaded bytes on the progress stage", async () => {
    const steps = [
      { bytesTransferred: 0, totalBytes: 400 },
      { bytesTransferred: 100, totalBytes: 400 },
    ];
    vi.mocked(uploadBytesResumable).mockImplementation(() => mockUploadTask("ok", steps) as never);
    const task = createLoadTask({ label: "Sending photo" });
    const counts: Array<[number, number]> = [];
    const stage = task.root.stage.bind(task.root);
    vi.spyOn(task.root, "stage").mockImplementation((spec) => {
      const node = stage(spec);
      const setCount = node.setCount.bind(node);
      node.setCount = (done, total) => {
        counts.push([done, total]);
        setCount(done, total);
      };
      return node;
    });

    await withMockImage(800, 600, async () => {
      await uploadPhotoAnswer("session-1", "question-1", photoFile(), hiderSession, "hider-1", {
        progress: task.root,
      });
    });

    expect(task.root.children.map((child) => child.spec.historyKey)).toEqual([
      "photo:compress",
      "photo:upload",
    ]);
    expect(counts).toEqual([
      [0, 400],
      [100, 400],
    ]);
    expect(task.root.children.every((child) => child.isFinished)).toBe(true);
  });

  it("cancels the upload on abort without reporting a failure", async () => {
    const pending = {
      on: vi.fn(),
      cancel: vi.fn(),
      // biome-ignore lint/suspicious/noThenProperty: Firebase's UploadTask is thenable.
      then: (_resolve: () => void, reject: (error: unknown) => void) => {
        pending.cancel.mockImplementation(() => {
          reject(new FirebaseError("storage/canceled", "User canceled the upload."));
          return true;
        });
      },
    };
    vi.mocked(uploadBytesResumable).mockReturnValue(pending as never);
    const controller = new AbortController();
    const { capturePhotoUploadFailure } = await import("../analytics/clientErrors");

    await withMockImage(800, 600, async () => {
      const upload = uploadPhotoAnswer(
        "session-1",
        "question-1",
        photoFile(),
        hiderSession,
        "hider-1",
        { signal: controller.signal },
      );
      await vi.waitFor(() => expect(uploadBytesResumable).toHaveBeenCalled());
      controller.abort(new DOMException("Cancelled.", "AbortError"));
      await expect(upload).rejects.toMatchObject({ name: "AbortError" });
    });

    expect(pending.cancel).toHaveBeenCalledOnce();
    expect(capturePhotoUploadFailure).not.toHaveBeenCalled();
  });

  it("deletes stored photo answers", async () => {
    vi.mocked(deleteObject).mockResolvedValue(undefined as never);

    await deletePhotoAnswer("sessions/session-1/photoAnswers/question-1/1700000000000.jpg");

    expect(deleteObject).toHaveBeenCalledOnce();
  });

  it("resolves download URLs for stored photos", async () => {
    vi.mocked(getDownloadURL).mockResolvedValue("https://example.com/photo.jpg");

    await expect(
      getPhotoDownloadUrl("sessions/session-1/photoAnswers/question-1/photo.jpg"),
    ).resolves.toBe("https://example.com/photo.jpg");
  });
});
