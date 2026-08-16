import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { RequestPreloadSection } from "./RequestPreloadSection";

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

describe("RequestPreloadSection", () => {
  beforeEach(() => {
    authState.isPermanent = true;
    authState.authReady = true;
  });

  it("submits the snapshot fields via the API", async () => {
    const createPreloadRequestFn = vi.fn().mockResolvedValue({
      requestId: "req-1",
      status: "open",
    });
    const getSnapshot = vi.fn(() => baseSnapshot);

    render(
      <RequestPreloadSection
        getSnapshot={getSnapshot}
        createPreloadRequestFn={createPreloadRequestFn}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText("Anything helpful about this area?"),
      { target: { value: "Coastal play" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Request preload" }));

    await waitFor(() => {
      expect(getSnapshot).toHaveBeenCalled();
      expect(createPreloadRequestFn).toHaveBeenCalledWith({
        presetSnapshot: baseSnapshot,
        note: "Coastal play",
      });
    });

    expect(
      screen.getByText("Request submitted. We will review it manually."),
    ).toBeInTheDocument();
  });

  it("prompts for sign-in when the user is not permanent", () => {
    authState.isPermanent = false;

    render(
      <RequestPreloadSection
        getSnapshot={() => baseSnapshot}
        createPreloadRequestFn={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Sign in with Google or email to submit a preload request.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request preload" }),
    ).not.toBeInTheDocument();
  });

  it("mentions manual review in the helper copy", () => {
    render(
      <RequestPreloadSection
        getSnapshot={() => baseSnapshot}
        createPreloadRequestFn={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/reviewed manually and are not instant/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Request a custom location pack"),
    ).toBeInTheDocument();
  });
});
