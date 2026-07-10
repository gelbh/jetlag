import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { describe, expect, it, vi } from "vitest";
import { PhotoAnswerUploader } from "./PhotoAnswerUploader";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { ensureAnonymousUser } from "../../services/core/firebase";

vi.mock("../../services/core/photoStorage", () => ({
  deletePhotoAnswer: vi.fn(),
  uploadPhotoAnswer: vi.fn(),
}));

vi.mock("../../services/core/firebase", () => ({
  ensureAnonymousUser: vi.fn().mockResolvedValue({ uid: "hider-1" }),
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      session: {
        id: "session-1",
        code: "ABCD",
        memberUids: ["hider-1"],
        memberRoles: { "hider-1": "hider" },
      },
      myUid: "hider-1",
    }),
}));

import { deletePhotoAnswer, uploadPhotoAnswer } from "../../services/core/photoStorage";

const pendingQuestion: PendingQuestionRecord = {
  id: "pq-photo",
  sessionId: "session-1",
  toolType: "photo",
  createdByUid: "seeker-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "pending",
  placement: {
    geometryJson: "{}",
    metadata: { photoCategoryId: "tree" },
  },
  replyOptions: [
    { id: "photo", label: "Upload photo" },
    { id: "cannot_answer", label: "I cannot answer the question" },
  ],
  promptText: "Send me a photo of a tree.",
  answerableAt: "2026-01-01T00:00:00.000Z",
};

describe("PhotoAnswerUploader", () => {
  it("submits cannot-answer without upload", async () => {
    const onAnswerQuestion = vi.fn().mockResolvedValue(undefined);

    render(
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={onAnswerQuestion}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "I cannot answer the question" }),
    );

    await waitFor(() => {
      expect(onAnswerQuestion).toHaveBeenCalledWith(
        "pq-photo",
        "msg-1",
        { kind: "cannot_answer" },
        "cannot_answer",
        false,
      );
    });
    expect(uploadPhotoAnswer).not.toHaveBeenCalled();
  });

  it("disables upload until auth uid resolves", async () => {
    let resolveAuth: (user: User) => void = () => undefined;
    vi.mocked(ensureAnonymousUser).mockReturnValue(
      new Promise<User>((resolve) => {
        resolveAuth = resolve;
      }),
    );

    render(
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Upload photo" })).toBeDisabled();
    expect(screen.getByText("Confirming hider access…")).toBeInTheDocument();

    resolveAuth({ uid: "hider-1" } as User);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Upload photo" }),
      ).not.toBeDisabled();
    });
  });

  it("uploads a photo before submitting the answer", async () => {
    const onAnswerQuestion = vi.fn().mockResolvedValue(undefined);
    vi.mocked(uploadPhotoAnswer).mockResolvedValue(
      "sessions/session-1/photoAnswers/pq-photo/photo.jpg",
    );

    render(
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={onAnswerQuestion}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Upload photo" }),
      ).not.toBeDisabled();
    });

    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadPhotoAnswer).toHaveBeenCalledWith(
        "session-1",
        "pq-photo",
        file,
        {
          id: "session-1",
          code: "ABCD",
          memberUids: ["hider-1"],
          memberRoles: { "hider-1": "hider" },
        },
        "hider-1",
      );
    });

    expect(onAnswerQuestion).toHaveBeenCalledWith(
      "pq-photo",
      "msg-1",
      {
        kind: "photo",
        storagePath: "sessions/session-1/photoAnswers/pq-photo/photo.jpg",
      },
      "photo",
      false,
    );
    expect(deletePhotoAnswer).not.toHaveBeenCalled();
  });

  it("deletes uploaded photos when saving the answer fails", async () => {
    const onAnswerQuestion = vi
      .fn()
      .mockRejectedValue(new Error("Could not save your answer."));
    vi.mocked(uploadPhotoAnswer).mockResolvedValue(
      "sessions/session-1/photoAnswers/pq-photo/photo.jpg",
    );
    vi.mocked(deletePhotoAnswer).mockResolvedValue(undefined);

    render(
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={onAnswerQuestion}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Upload photo" }),
      ).not.toBeDisabled();
    });

    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(deletePhotoAnswer).toHaveBeenCalledWith(
        "sessions/session-1/photoAnswers/pq-photo/photo.jpg",
      );
    });

    expect(
      screen.getByText("Could not save your answer."),
    ).toBeInTheDocument();
  });

  it("does not use capture on the file input", () => {
    render(
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.hasAttribute("capture")).toBe(false);
  });
});
