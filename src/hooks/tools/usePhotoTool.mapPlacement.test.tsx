import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePhotoTool } from "./usePhotoTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => true,
}));

describe("usePhotoTool map-first", () => {
  it("suppresses the Ask sheet after a photo category is chosen", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      usePhotoTool({
        active: true,
        gameSize: "medium",
        distanceUnit: mocks.distanceUnit,
        pendingQuestions: [],
        awaitHiderAnswer: true,
        submitPendingQuestion: vi.fn(async () => undefined),
        sessionId: "s1",
        senderUid: "u1",
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        canSubmitQuestion: true,
      }),
    );

    expect(result.current.hud?.suppressSheet).toBeFalsy();
    expect(result.current.hud?.modeBody).not.toBeNull();

    act(() => {
      (
        result.current.hud!.modeBody as {
          props: { onCategoryChange: (id: string) => void };
        }
      ).props.onCategoryChange("tree");
    });

    await waitFor(() => {
      expect(result.current.hud?.suppressSheet).toBe(true);
    });

    expect(result.current.hud?.mapOverlay).not.toBeNull();
    expect(result.current.hud?.modeBody).toBeNull();
  });
});
