import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  persistLocationAccessConfirmed,
  resetLocationPermissionUiForTests,
  retainLocationPermissionDemand,
} from "@/services/core/location/locationPermissionUi";
import { createMockGeolocationPosition, mockGeolocation } from "@/test/mocks/geolocation";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { LocationPermissionPrompt } from "./LocationPermissionPrompt";

function mockPermissions(state: PermissionState): void {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: vi.fn(async () => ({ state })),
    },
  });
}

describe("LocationPermissionPrompt", () => {
  afterEach(() => {
    resetLocationPermissionUiForTests();
    vi.unstubAllGlobals();
  });

  it("shows Allow location when a feature demands GPS and permission is prompt", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    const release = retainLocationPermissionDemand();

    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LocationPermissionPrompt />
      </MemoryRouter>,
    );

    const dialog = await screen.findByRole("dialog", {
      name: /allow location/i,
    });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => {
      expect(dialog).toHaveFocus();
    });
    expect(dialog.className).not.toMatch(/map-float-alert/);
    expect(screen.getByRole("button", { name: /allow location/i })).toBeInTheDocument();

    release();
  });

  it("hides when nothing demands location", () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");

    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LocationPermissionPrompt />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides after a successful Allow when Permissions API stays prompt", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    const release = retainLocationPermissionDemand();
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LocationPermissionPrompt />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /allow location/i }));

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    release();
  });

  it("hides when persisted confirmation quietly restores", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    persistLocationAccessConfirmed();
    const release = retainLocationPermissionDemand();
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LocationPermissionPrompt />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    release();
  });

  it("requests location from the Allow CTA", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    const release = retainLocationPermissionDemand();
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LocationPermissionPrompt />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /allow location/i }));

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });

    release();
  });

  it("shows blocked guidance when permission is denied", async () => {
    mockGeolocation(null);
    mockPermissions("denied");
    const release = retainLocationPermissionDemand();

    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LocationPermissionPrompt />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("dialog", { name: /location blocked/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    release();
  });

  it("shows blocked guidance when quiet restore is denied under Permissions prompt", async () => {
    mockGeolocation(null);
    mockPermissions("prompt");
    persistLocationAccessConfirmed();
    const release = retainLocationPermissionDemand();
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LocationPermissionPrompt />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });

    expect(await screen.findByRole("dialog", { name: /location blocked/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    release();
  });
});
