import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("maps default / flag / ghost variants to Survey class tokens", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-canvas");
    expect(buttonVariants({ variant: "default" })).toContain("text-field-ink");
    expect(buttonVariants({ variant: "flag" })).toContain("bg-flag");
    expect(buttonVariants({ variant: "flag" })).toContain("text-flag-ink");
    expect(buttonVariants({ variant: "ghost" })).toContain("bg-transparent");
  });

  it("maps densify size for dock chrome", () => {
    expect(buttonVariants({ size: "densify" })).toContain("h-8");
    expect(buttonVariants({ size: "densify" })).toContain("text-xs");
  });

  it("renders a button with merged variant classes", () => {
    render(
      <Button variant="flag" size="densify">
        Ask
      </Button>,
    );
    const node = screen.getByRole("button", { name: "Ask" });
    expect(node).toHaveAttribute("data-slot", "button");
    expect(node.className).toContain("bg-flag");
    expect(node.className).toContain("h-8");
  });
});
