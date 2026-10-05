import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { jetlagTheme } from "../../theme/theme";
import { PhotoAnswerUploader } from "./PhotoAnswerUploader";

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

function renderUploader(
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void> = vi.fn(),
) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="light">
      <PhotoAnswerUploader
        sessionId="session-1"
        pendingQuestion={pendingQuestion}
        messageId="msg-1"
        onAnswerQuestion={onAnswerQuestion}
      />
    </MantineProvider>,
  );
}

describe("PhotoAnswerUploader", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("shows outage notice and mark-sent action", () => {
    renderUploader();

    expect(screen.getByText(/In-app photo upload is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark sent" })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    // Local anti-regression: do not revive pre-Mantine button classes.
    expect(document.querySelector(".btn-primary")).toBeNull();
    expect(document.querySelector(".btn-secondary")).toBeNull();
  });

  it("submits mark-sent without storage calls", async () => {
    const onAnswerQuestion = vi.fn().mockResolvedValue(undefined);
    renderUploader(onAnswerQuestion);

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
    renderUploader(onAnswerQuestion);

    fireEvent.click(screen.getByRole("button", { name: "I cannot answer the question" }));

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

  it("shows an error when saving the answer fails", async () => {
    const onAnswerQuestion = vi.fn().mockRejectedValue(new Error("Could not save your answer."));
    renderUploader(onAnswerQuestion);

    fireEvent.click(screen.getByRole("button", { name: "Mark sent" }));

    await waitFor(() => {
      expect(screen.getByText("Could not save your answer.")).toBeInTheDocument();
    });
  });
});
