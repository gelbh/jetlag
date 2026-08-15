import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PackAttachChip } from "./PackAttachChip";

describe("PackAttachChip", () => {
  it("calls onClear when Clear is pressed", () => {
    const onClear = vi.fn();

    render(
      <PackAttachChip
        packId="dublin"
        source="auto"
        onClear={onClear}
        onChangePack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("calls onChangePack when a different pack is selected", () => {
    const onChangePack = vi.fn();

    render(
      <PackAttachChip
        packId="dublin"
        source="auto"
        onClear={vi.fn()}
        onChangePack={onChangePack}
        packOptions={["dublin", "london"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Change location pack"), {
      target: { value: "london" },
    });

    expect(onChangePack).toHaveBeenCalledWith("london");
  });

  it("shows auto-match hint for auto source", () => {
    render(
      <PackAttachChip
        packId="nyc"
        source="auto"
        onClear={vi.fn()}
        onChangePack={vi.fn()}
      />,
    );

    expect(screen.getByText(/Matched to play area/i)).toBeInTheDocument();
    expect(screen.getByText(/New York City/i)).toBeInTheDocument();
  });
});
