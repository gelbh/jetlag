import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJoinSessionPreview } from "./useJoinSessionPreview";
import { JOIN_PREVIEW_DEBOUNCE_MS } from "../../services/session/joinSessionPreviewCache";
import { createTestRemoteSession } from "../../test/fixtures/sessions";

const {
  mockIsFirebaseConfigured,
  mockEnsureAnonymousUser,
  mockLookupRemoteSessionByCode,
} = vi.hoisted(() => ({
  mockIsFirebaseConfigured: vi.fn(() => true),
  mockEnsureAnonymousUser: vi.fn(async () => ({ uid: "user-1" })),
  mockLookupRemoteSessionByCode: vi.fn(),
}));

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => mockIsFirebaseConfigured(),
  ensureAnonymousUser: () => mockEnsureAnonymousUser(),
}));

vi.mock("../../services/firestore/firestoreAnnotations", () => ({
  lookupRemoteSessionByCode: (code: string) =>
    mockLookupRemoteSessionByCode(code),
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useJoinSessionPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "user-1" });
    mockLookupRemoteSessionByCode.mockResolvedValue({
      status: "found",
      session: createTestRemoteSession({ code: "ABCD" }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays idle until the debounced code is valid", async () => {
    const { result } = renderHook(() => useJoinSessionPreview("AB"), {
      wrapper: createWrapper(),
    });

    expect(result.current.lookupLoading).toBe(false);
    expect(result.current.previewSession).toBeNull();
    expect(mockLookupRemoteSessionByCode).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(JOIN_PREVIEW_DEBOUNCE_MS);
    });

    expect(mockLookupRemoteSessionByCode).not.toHaveBeenCalled();
  });

  it("loads a found preview after debounce", async () => {
    const { result } = renderHook(() => useJoinSessionPreview("ABCD"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(JOIN_PREVIEW_DEBOUNCE_MS + 50);
    });

    await waitFor(() => {
      expect(result.current.previewSession?.code).toBe("ABCD");
    });
    expect(mockLookupRemoteSessionByCode).toHaveBeenCalledWith("ABCD");
  });

  it("clears preview while the live code is still settling", async () => {
    const { result, rerender } = renderHook(
      ({ code }: { code: string }) => useJoinSessionPreview(code),
      { wrapper: createWrapper(), initialProps: { code: "ABCD" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(JOIN_PREVIEW_DEBOUNCE_MS + 50);
    });
    await waitFor(() => {
      expect(result.current.previewSession?.code).toBe("ABCD");
    });

    rerender({ code: "EFGH" });
    expect(result.current.previewSession).toBeNull();
    expect(result.current.lookupLoading).toBe(true);
  });
});
