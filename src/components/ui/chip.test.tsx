import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chip, chipVariants } from "./chip";

describe("Chip", () => {
  it("maps default / flag / ghost variants to Survey class tokens", () => {
    expect(chipVariants({ variant: "default" })).toContain("rounded-full");
    expect(chipVariants({ variant: "default" })).toContain("bg-canvas");
    expect(chipVariants({ variant: "flag" })).toContain("bg-flag");
    expect(chipVariants({ variant: "ghost" })).toContain("text-field-ink-muted");
  });

  it("maps densify size for dock chrome", () => {
    expect(chipVariants({ size: "densify" })).toContain("h-6");
  });

  it("renders a chip button with variant classes", () => {
    render(
      <Chip variant="flag" size="densify">
        Train
      </Chip>,
    );
    const node = screen.getByRole("button", { name: "Train" });
    expect(node).toHaveAttribute("data-slot", "chip");
    expect(node).toHaveAttribute("type", "button");
    expect(node.className).toContain("bg-flag");
    expect(node.className).toContain("h-6");
  });
});
