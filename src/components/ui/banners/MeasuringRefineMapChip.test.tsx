import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MeasuringRefineMapChip } from "./MeasuringRefineMapChip";

const mockUsePlayerUiMantine = vi.fn(() => false);

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

describe("MeasuringRefineMapChip", () => {
  it("uses measuring copy by default", () => {
    render(<MeasuringRefineMapChip visible />);
    expect(screen.getByText("Refining measure")).toBeTruthy();
    expect(screen.getByText("Adding detail to the shaded area…")).toBeTruthy();
  });

  it("renders catalog hydrate copy when provided", () => {
    render(
      <MeasuringRefineMapChip
        visible
        title="Loading places"
        body="Adding remaining areas to the map…"
      />,
    );
    expect(screen.getByText("Loading places")).toBeTruthy();
    expect(screen.getByText("Adding remaining areas to the map…")).toBeTruthy();
  });

  it("uses frosted iOS chrome under mantine player UI", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MeasuringRefineMapChip
        visible
        title="Loading places"
        body="Adding remaining areas to the map…"
      />,
    );
    expect(screen.getByTestId("measuring-refine-chip")).toHaveAttribute(
      "data-player-ux-world",
      "mantine",
    );
    expect(screen.getByText("Loading places")).toBeTruthy();
  });

  it("hides when not refining", () => {
    const { container } = render(<MeasuringRefineMapChip visible={false} />);
    expect(container.querySelector("[role='status']")).toBeNull();
  });
});
