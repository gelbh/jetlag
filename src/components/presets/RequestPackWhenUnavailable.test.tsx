import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { RequestPackWhenUnavailable } from "./RequestPackWhenUnavailable";

const authState = {
  user: { uid: "user-1", isAnonymous: false } as const,
  isPermanent: true,
  authReady: true,
};

vi.mock("../../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => authState,
}));

const baseSnapshot = {
  name: "Cork weekend",
  placeLabel: "Cork, Ireland",
  gameSize: "medium" as const,
  distanceUnit: "metric" as const,
  focusBounds: { south: 51.8, west: -8.6, north: 51.95, east: -8.35 },
  gameAreaBytes: 1200,
  presetId: "preset-1",
};

describe("RequestPackWhenUnavailable", () => {
  beforeEach(() => {
    authState.isPermanent = true;
    authState.authReady = true;
  });

  it("submits via createPreloadRequest", async () => {
    const createPreloadRequestFn = vi.fn().mockResolvedValue({
      requestId: "req-1",
      status: "open",
    });

    render(
      <RequestPackWhenUnavailable
        getSnapshot={() => baseSnapshot}
        createPreloadRequestFn={createPreloadRequestFn}
      />,
    );

    expect(
      screen.getByText("Request a custom location pack"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Request preload" }));

    await waitFor(() => {
      expect(createPreloadRequestFn).toHaveBeenCalledWith({
        presetSnapshot: baseSnapshot,
        note: null,
      });
    });
  });

  it("hides after dismiss", () => {
    render(
      <RequestPackWhenUnavailable
        getSnapshot={() => baseSnapshot}
        createPreloadRequestFn={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(
      screen.queryByText("Request a custom location pack"),
    ).not.toBeInTheDocument();
  });
});
