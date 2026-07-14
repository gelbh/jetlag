import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoAnswerUploader } from "./PhotoAnswerUploader";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";

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
    { id: "sent_externally", label: "Mark sent" },
    { id: "cannot_answer", label: "I cannot answer the question" },
  ],
  promptText: "Send me a photo of a tree.",
  answerableAt: "2026-01-01T00:00:00.000Z",
};

describe("PhotoAnswerUploader", () => {
  it("shows outage notice and mark-sent action", () => {
    render(
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/In-app photo upload is temporarily unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark sent" })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("submits mark-sent without storage calls", async () => {
    const onAnswerQuestion = vi.fn().mockResolvedValue(undefined);

    render(
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={onAnswerQuestion}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark sent" }));

    await waitFor(() => {
      expect(onAnswerQuestion).toHaveBeenCalledWith(
        "pq-photo",
        "msg-1",
        { kind: "sent_externally" },
        "sent_externally",
        false,
      );
    });
  });

  it("submits cannot-answer", async () => {
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
  });
});
