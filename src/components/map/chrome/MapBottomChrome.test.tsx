import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapBottomChrome } from "./MapBottomChrome";

describe("MapBottomChrome", () => {
  it("renders provided islands and omits empty ones", () => {
    render(
      <MapBottomChrome
        layout="phone"
        history={<button type="button">Undo</button>}
        hunt={<button type="button">Radar</button>}
        session={<button type="button">Chat</button>}
        mapControls={<button type="button">Recenter map on play area</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Recenter map on play area" }),
    ).toBeInTheDocument();
  });

  it("omits history region when history is undefined", () => {
    const { container } = render(
      <MapBottomChrome layout="phone" hunt={<button type="button">Radar</button>} />,
    );
    expect(container.querySelector('[data-island="history"]')).toBeNull();
    expect(container.querySelector('[data-island="hunt"]')).not.toBeNull();
  });
});
