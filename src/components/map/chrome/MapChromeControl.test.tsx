import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapChromeControl } from "./MapChromeControl";

describe("MapChromeControl", () => {
  it("renders a floating chrome button with icon slot and fires click", () => {
    const onClick = vi.fn();
    render(
      <MapChromeControl
        aria-label="Zoom in"
        icon={<span data-testid="icon">+</span>}
        onClick={onClick}
      />,
    );

    const button = screen.getByRole("button", { name: "Zoom in" });
    expect(button).toHaveClass("map-chrome-control", "hud-chrome");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("exposes pressed state for toggle controls", () => {
    render(
      <MapChromeControl
        aria-label="Switch to map view"
        pressed
        icon={<span>sat</span>}
      />,
    );

    const button = screen.getByRole("button", { name: "Switch to map view" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass("map-chrome-control--pressed", "hud-chrome-active");
  });

  it("keeps legacy floating size classes via className", () => {
    render(
      <MapChromeControl
        className="map-zoom-control__btn"
        aria-label="Zoom in"
        icon={<span>+</span>}
      />,
    );

    expect(screen.getByRole("button", { name: "Zoom in" })).toHaveClass(
      "map-chrome-control",
      "map-zoom-control__btn",
    );
  });

  it("renders a side-dock slot with icon and label", () => {
    render(
      <MapChromeControl
        variant="slot"
        aria-label="Recenter map on play area"
        icon={<span data-testid="slot-icon">↻</span>}
        label="Recenter"
      />,
    );

    const button = screen.getByRole("button", {
      name: "Recenter map on play area",
    });
    expect(button).toHaveClass("jl-tool-slot");
    expect(button).not.toHaveClass("map-chrome-control");
    expect(screen.getByTestId("slot-icon")).toBeInTheDocument();
    expect(screen.getByText("Recenter")).toHaveClass("jl-tool-slot-label");
  });

  it("prefers children over icon/label slots", () => {
    render(
      <MapChromeControl aria-label="Custom">
        <span data-testid="custom-body">preview</span>
      </MapChromeControl>,
    );

    expect(screen.getByTestId("custom-body")).toBeInTheDocument();
  });

  it("honors disabled", () => {
    const onClick = vi.fn();
    render(
      <MapChromeControl
        aria-label="Zoom out"
        disabled
        onClick={onClick}
        icon={<span>-</span>}
      />,
    );

    const button = screen.getByRole("button", { name: "Zoom out" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
