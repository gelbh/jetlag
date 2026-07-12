import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { CreateSession } from "./CreateSession";
import { renderWithRouter } from "../test/renderWithRouter";
import type { GeocodedPlace } from "../services/geo/geocoding";

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
  placeCategory: "city",
  approximateAreaSqMi: 180,
};

vi.mock("../services/geo/geocoding", () => ({
  searchPlaces: vi.fn(async () => [dublinPlace]),
}));

vi.mock("../services/core/geolocation", () => ({
  getCurrentPosition: vi.fn().mockResolvedValue({
    lat: 53.35,
    lng: -6.26,
    accuracy: null,
    heading: null,
  }),
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

vi.mock("../services/core/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
  getFirebaseAuth: () => ({ currentUser: null }),
}));

vi.mock("../services/session/gameAreaPreload", () => ({
  preloadGameAreaCaches: vi.fn(),
  preloadCriticalGameAreaCaches: vi.fn(async () => undefined),
}));

vi.mock("../services/geo/seaLevelProgressive", () => ({
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
  it("renders shape picker and fullscreen framing entry point", () => {
    renderWithRouter(<CreateSession />);

    expect(screen.getByRole("tab", { name: "Square" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Circle" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Polygon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open fullscreen map" })).toBeInTheDocument();
  });

  it("creates a local session and navigates to the map", async () => {
    renderWithRouter(<CreateSession />);

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm game area" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/map", { viewTransition: true });
    });
  });

  it("navigates to the map even when critical preload hangs", async () => {
    const { preloadCriticalGameAreaCaches } = await import(
      "../services/session/gameAreaPreload"
    );
    vi.mocked(preloadCriticalGameAreaCaches).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderWithRouter(<CreateSession />);

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm game area" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/map", { viewTransition: true });
    });
  });

  it("keeps place-based preview after user map pan", async () => {
    renderWithRouter(<CreateSession />);

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    await waitFor(() => {
      expect(screen.getByText("city · ~180 sq mi")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Simulate user map frame" }),
    );

    expect(screen.getByText("city · ~180 sq mi")).toBeInTheDocument();
    expect(screen.getAllByText(/sq mi play area/i).length).toBeGreaterThan(0);
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

  it("shows place category and area in search results", async () => {
    const { searchPlaces } = await import("../services/geo/geocoding");
    const cityPlace: GeocodedPlace = {
      ...dublinPlace,
      id: "dublin-city",
      displayName: "Dublin, County Dublin, Ireland",
      placeCategory: "city",
      approximateAreaSqMi: 42,
    };
    const countyPlace: GeocodedPlace = {
      ...dublinPlace,
      id: "dublin-county",
      displayName: "County Dublin, Ireland",
      placeCategory: "county",
      approximateAreaSqMi: 350,
    };

    vi.mocked(searchPlaces).mockResolvedValueOnce([cityPlace, countyPlace]);

    renderWithRouter(<CreateSession />);

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    await waitFor(() => {
      expect(screen.getByText("city · ~42 sq mi")).toBeInTheDocument();
      expect(screen.getByText("county · ~350 sq mi")).toBeInTheDocument();
    });
  });

  it("passes user location into place search when GPS is available", async () => {
    const { searchPlaces } = await import("../services/geo/geocoding");
    const { getCurrentPosition } = await import("../services/core/geolocation");

    renderWithRouter(<CreateSession />);

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    await waitFor(() => {
      expect(searchPlaces).toHaveBeenCalledWith("Dublin", {
        near: [53.35, -6.26],
      });
    });
  });
});
