import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { MapChromeControl } from "./MapChromeControl";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

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

  it("fires clicks and honors disabled for side-dock slots", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <MapChromeControl
        variant="slot"
        aria-label="Open chat"
        icon={<span>chat</span>}
        label="Chat"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open chat" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <MapChromeControl
        variant="slot"
        aria-label="Open chat"
        icon={<span>chat</span>}
        label="Chat"
        disabled
        onClick={onClick}
      />,
    );

    const button = screen.getByRole("button", { name: "Open chat" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("prefers children over icon/label slots", () => {
    render(
      <MapChromeControl
        aria-label="Custom"
        icon={<span data-testid="fallback-icon">icon</span>}
        label="Fallback"
      >
        <span data-testid="custom-body">preview</span>
      </MapChromeControl>,
    );

    expect(screen.getByTestId("custom-body")).toBeInTheDocument();
    expect(screen.queryByTestId("fallback-icon")).not.toBeInTheDocument();
    expect(screen.queryByText("Fallback")).not.toBeInTheDocument();
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

  it("keeps Survey slot path when Mantine flag is off", () => {
    render(
      <MapChromeControl
        variant="slot"
        aria-label="Matching"
        icon={<span>m</span>}
        label="Match"
        pressed
      />,
    );

    const button = screen.getByRole("button", { name: "Matching" });
    expect(button).toHaveClass("jl-tool-slot", "jl-tool-slot-active");
    expect(button.getAttribute("data-player-ux-world")).toBeNull();
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("mounts Mantine slot chrome when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MapChromeControl
          variant="slot"
          aria-label="Matching"
          icon={<span data-testid="mantine-slot-icon">m</span>}
          label="Match"
          pressed
        />
      </MantineProvider>,
    );

    const button = screen.getByRole("button", { name: "Matching" });
    expect(button.getAttribute("data-player-ux-world")).toBe("mantine");
    expect(button).toHaveClass("jl-tool-slot");
    expect(button).not.toHaveClass("jl-tool-slot-active");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("mantine-slot-icon")).toBeInTheDocument();
    expect(screen.getByText("Match")).not.toHaveClass("jl-tool-slot-label");
    expect(screen.getByText("Match").getAttribute("data-ios-tool-label")).toBe(
      "",
    );
    expect(button.getAttribute("data-ios-tool-tone")).toBe("tool");
  });

  it("marks history tone on undo-style slots when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MapChromeControl
          variant="slot"
          tone="history"
          aria-label="Undo last annotation"
          icon={<span>u</span>}
          label="Undo"
        />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Undo last annotation" }),
    ).toHaveAttribute("data-ios-tool-tone", "history");
  });
});
