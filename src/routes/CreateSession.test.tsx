import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { CreateSession } from "./CreateSession";
import { renderWithRouter } from "../test/renderWithRouter";

const mockBounds = {
  getSouthWest: () => ({ lat: 53.27, lng: -6.45 }),
  getNorthEast: () => ({ lat: 53.42, lng: -6.08 }),
};

vi.mock("../components/map/MapView", () => ({
  MapView: ({
    onBoundsChange,
  }: {
    onBoundsChange?: (bounds: typeof mockBounds) => void;
  }) => {
    useEffect(() => {
      onBoundsChange?.(mockBounds);
    }, [onBoundsChange]);
    return <div data-testid="create-map" />;
  },
}));

vi.mock("../components/map/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

vi.mock("../services/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
}));

vi.mock("../services/gameAreaPreload", () => ({
  preloadGameAreaCaches: vi.fn(),
  preloadCriticalGameAreaCaches: vi.fn(async () => undefined),
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("CreateSession", () => {
  it("creates a local session and navigates to the map", async () => {
    renderWithRouter(<CreateSession />);

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm game area" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/map");
    });
  });

  it("navigates to the map even when critical preload hangs", async () => {
    const { preloadCriticalGameAreaCaches } = await import(
      "../services/gameAreaPreload"
    );
    vi.mocked(preloadCriticalGameAreaCaches).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderWithRouter(<CreateSession />);

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm game area" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/map");
    });
  });
});
