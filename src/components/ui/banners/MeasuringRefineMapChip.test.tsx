import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { MeasuringRefineMapChip } from "./MeasuringRefineMapChip";

beforeEach(() => {
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
    renderWithAppUi(<MeasuringRefineMapChip visible />);
    expect(screen.getByText("Refining measure")).toBeTruthy();
    expect(screen.getByText("Adding detail to the shaded area…")).toBeTruthy();
  });

  it("renders catalog hydrate copy when provided", () => {
    renderWithAppUi(
      <MeasuringRefineMapChip
        visible
        title="Loading places"
        body="Adding remaining areas to the map…"
      />,
    );
    expect(screen.getByText("Loading places")).toBeTruthy();
    expect(screen.getByText("Adding remaining areas to the map…")).toBeTruthy();
  });

  it("uses MapFloatSurface without Survey float chrome", () => {
    renderWithAppUi(
      <MeasuringRefineMapChip
        visible
        title="Loading places"
        body="Adding remaining areas to the map…"
      />,
    );
    const chip = screen.getByTestId("measuring-refine-chip");
    expect(chip).toBeInTheDocument();
    expect(chip.className).not.toMatch(/map-float-alert/);
    expect(screen.getByText("Loading places")).toBeTruthy();
  });

  it("hides when not refining", () => {
    const { container } = renderWithAppUi(
      <MeasuringRefineMapChip visible={false} />,
    );
    expect(container.querySelector("[role='status']")).toBeNull();
  });
});
