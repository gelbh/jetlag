import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Island, islandVariants } from "./island";

describe("Island", () => {
  it("maps default / flag / ghost variants to Survey class tokens", () => {
    expect(islandVariants({ variant: "default" })).toContain("bg-canvas");
    expect(islandVariants({ variant: "default" })).toContain("border-rule");
    expect(islandVariants({ variant: "flag" })).toContain("bg-flag-soft");
    expect(islandVariants({ variant: "ghost" })).toContain("shadow-none");
  });

  it("maps densify size for dock chrome", () => {
    expect(islandVariants({ size: "densify" })).toContain("min-h-9");
  });

  it("renders an island shell with variant classes", () => {
    render(
      <Island variant="default" size="densify" data-testid="hunt-island">
        Tools
      </Island>,
    );
    const node = screen.getByTestId("hunt-island");
    expect(node).toHaveAttribute("data-slot", "island");
    expect(node.className).toContain("bg-canvas");
    expect(node.className).toContain("min-h-9");
    expect(node).toHaveTextContent("Tools");
  });

  it("forwards asChild onto a section", () => {
    render(
      <Island asChild variant="flag" size="densify">
        <section aria-label="Hunt island">Tools</section>
      </Island>,
    );
    const node = screen.getByRole("region", { name: "Hunt island" });
    expect(node).toHaveAttribute("data-slot", "island");
    expect(node.className).toContain("bg-flag-soft");
    expect(node.className).toContain("min-h-9");
  });

  it("keeps data-slot stable when callers pass a conflicting value", () => {
    render(
      <Island data-slot="override" data-testid="slot-guard">
        Tools
      </Island>,
    );
    expect(screen.getByTestId("slot-guard")).toHaveAttribute(
      "data-slot",
      "island",
    );
  });
});
