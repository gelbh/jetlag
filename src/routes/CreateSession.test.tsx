import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { CreateSession } from "./CreateSession";
import { renderWithRouter } from "../test/renderWithRouter";
import type { GeocodedPlace } from "../services/geocoding";

const mockBounds = {
  getSouthWest: () => ({ lat: 53.27, lng: -6.45 }),
  getNorthEast: () => ({ lat: 53.42, lng: -6.08 }),
};

const dublinPlace: GeocodedPlace = {
  id: "dublin",
  displayName: "Dublin, Ireland",
  bounds: {
    south: 53.27,
    west: -6.45,
    north: 53.42,
    east: -6.08,
  },
  center: [53.35, -6.26] as const,
  boundary: {
    type: "Polygon",
    coordinates: [
      [
        [-6.45, 53.27],
        [-6.08, 53.27],
        [-6.08, 53.42],
        [-6.45, 53.42],
        [-6.45, 53.27],
      ],
    ],
  },
};

vi.mock("../services/geocoding", () => ({
  searchPlaces: vi.fn(async () => [dublinPlace]),
}));

vi.mock("../components/map/MapView", () => ({
  MapView: ({
    onBoundsChange,
    onUserViewportFramed,
  }: {
    onBoundsChange?: (bounds: typeof mockBounds) => void;
    onUserViewportFramed?: () => void;
  }) => {
    const onBoundsChangeRef = useRef(onBoundsChange);

    useEffect(() => {
      onBoundsChangeRef.current = onBoundsChange;
    }, [onBoundsChange]);

    useEffect(() => {
      onBoundsChangeRef.current?.(mockBounds);
    }, [onBoundsChange]);

    return (
      <div data-testid="create-map">
        <button
          type="button"
          onClick={() => onUserViewportFramed?.()}
        >
          Simulate user map frame
        </button>
      </div>
    );
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

vi.mock("../services/seaLevelProgressive", () => ({
  startSeaLevelBackgroundSampling: vi.fn(),
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

  it("keeps place-based preview after changing session settings", async () => {
    renderWithRouter(<CreateSession />);

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    await waitFor(() => {
      expect(screen.getAllByText(/sq mi play area/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("radio", { name: /Hider/i }));

    expect(screen.getAllByText(/sq mi play area/i).length).toBeGreaterThan(0);
  });
});
