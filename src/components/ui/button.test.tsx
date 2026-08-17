import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    expect(node).toHaveAttribute("type", "button");
    expect(node.className).toContain("bg-flag");
    expect(node.className).toContain("h-8");
  });

  it("forwards asChild onto an anchor", () => {
    render(
      <Button asChild variant="flag">
        <a href="/ask">Ask link</a>
      </Button>,
    );
    const node = screen.getByRole("link", { name: "Ask link" });
    expect(node).toHaveAttribute("href", "/ask");
    expect(node).toHaveAttribute("data-slot", "button");
    expect(node.className).toContain("bg-flag");
  });

  it("preserves an explicit submit type", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("disables slotted anchors without native disabled", () => {
    const parentClick = vi.fn();
    const childClick = vi.fn();
    render(
      <Button asChild disabled onClick={parentClick}>
        <a href="/ask" tabIndex={0} onClick={childClick}>
          Locked
        </a>
      </Button>,
    );
    const node = screen.getByRole("link", { name: "Locked" });
    expect(node).toHaveAttribute("aria-disabled", "true");
    expect(node).toHaveAttribute("tabindex", "-1");
    expect(node).not.toHaveAttribute("disabled");
    fireEvent.click(node);
    expect(parentClick).not.toHaveBeenCalled();
    expect(childClick).not.toHaveBeenCalled();
    for (const key of ["Enter", " "] as const) {
      fireEvent.keyDown(node, { key });
      expect(parentClick).not.toHaveBeenCalled();
      expect(childClick).not.toHaveBeenCalled();
    }
  });
});
