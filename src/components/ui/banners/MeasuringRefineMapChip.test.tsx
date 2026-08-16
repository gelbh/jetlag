import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeasuringRefineMapChip } from "./MeasuringRefineMapChip";

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

  it("hides when not refining", () => {
    const { container } = render(<MeasuringRefineMapChip visible={false} />);
    expect(container.querySelector("[role='status']")).toBeNull();
  });
});
