import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoAnswerUploader } from "./PhotoAnswerUploader";
import type { PendingQuestionRecord } from "../../domain/sessionChat";

vi.mock("../../services/photoStorage", () => ({
  uploadPhotoAnswer: vi.fn(),
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      session: {
        id: "session-1",
        memberUids: ["hider-1"],
        memberRoles: { "hider-1": "hider" },
      },
      myUid: "hider-1",
    }),
}));

import { uploadPhotoAnswer } from "../../services/photoStorage";

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
