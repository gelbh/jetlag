import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePhotoTool } from "./usePhotoTool";

describe("usePhotoTool", () => {
  it("submits a photo pending question when a hider is in the session", async () => {
    const submitPendingQuestion = vi.fn(async () => undefined);
    const finishPlacement = vi.fn();
    const setMapError = vi.fn();

    const { result } = renderHook(() =>
      usePhotoTool({
        active: true,
        gameSize: "medium",
        pendingQuestions: [],
        awaitHiderAnswer: true,
        submitPendingQuestion,
        sessionId: "session-1",
        senderUid: "seeker-1",
        finishPlacement,
        setMapError,
        mapError: null,
      }),
    );

    expect(result.current.panel).not.toBeNull();
    render(result.current.panel!);

    await act(async () => {
      screen.getByRole("button", { name: /Send to hiders/i }).click();
    });

    expect(submitPendingQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        promptText: expect.stringMatching(/photo/i),
        placement: expect.objectContaining({
          metadata: expect.objectContaining({
            photoCategoryId: expect.any(String),
          }),
        }),
        cardDraw: 1,
        cardKeep: 1,
      }),
    );
    expect(finishPlacement).toHaveBeenCalled();
    expect(setMapError).toHaveBeenCalledWith(null);
  });

  it("does not render a panel without a hider session", () => {
    const { result } = renderHook(() =>
      usePhotoTool({
        active: true,
        gameSize: "medium",
        pendingQuestions: [],
        awaitHiderAnswer: false,
        finishPlacement: vi.fn(),
        setMapError: vi.fn(),
        mapError: null,
      }),
    );

    expect(result.current.panel).toBeNull();
  });

  it("blocks commit when another question is open", () => {
    const submitPendingQuestion = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      usePhotoTool({
        active: true,
        gameSize: "medium",
        pendingQuestions: [],
        awaitHiderAnswer: true,
        submitPendingQuestion,
        sessionId: "session-1",
        senderUid: "seeker-1",
        finishPlacement: vi.fn(),
        setMapError: vi.fn(),
        mapError: null,
        canSubmitQuestion: false,
      }),
    );

    render(result.current.panel!);

    expect(screen.getByRole("button", { name: /Send to hiders/i })).toBeDisabled();
    expect(submitPendingQuestion).not.toHaveBeenCalled();
  });

  it("ignores map clicks", () => {
    const { result } = renderHook(() =>
      usePhotoTool({
        active: true,
        gameSize: "medium",
        pendingQuestions: [],
        finishPlacement: vi.fn(),
        setMapError: vi.fn(),
        mapError: null,
      }),
    );

    expect(result.current.handleMapClick()).toBe(false);
  });
});
