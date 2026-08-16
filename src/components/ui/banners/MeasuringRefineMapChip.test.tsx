import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MeasuringRefineMapChip } from "./MeasuringRefineMapChip";

describe("MeasuringRefineMapChip", () => {
  it("shows locked copy when refining", () => {
    render(<MeasuringRefineMapChip visible />);
    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.getByText("Refining measure")).toBeInTheDocument();
    expect(
      screen.getByText("Adding detail to the shaded area…"),
    ).toBeInTheDocument();
  });

  it("hides when not refining", () => {
    const { container } = render(<MeasuringRefineMapChip visible={false} />);
    expect(container.querySelector("[role='status']")).toBeNull();
  });
});
