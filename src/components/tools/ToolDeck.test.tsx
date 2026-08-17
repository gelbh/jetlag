import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolDeck, ToolDeckGroup, ToolDeckInner } from "./ToolDeck";

describe("ToolDeck", () => {
  it("renders a full-width hunt Island with ≥44px default size", () => {
    render(
      <ToolDeck>
        <ToolDeckInner>
          <ToolDeckGroup>
            <button type="button" className="jl-tool-slot">
              Radar
            </button>
            <button type="button" className="jl-tool-slot">
              Matching
            </button>
          </ToolDeckGroup>
        </ToolDeckInner>
      </ToolDeck>,
    );
    const deck = screen.getByRole("group", { name: "Hunt tools" });
    expect(deck).toHaveAttribute("data-tool-deck");
    expect(deck).toHaveAttribute("data-island", "hunt");
    expect(deck).toHaveAttribute("data-slot", "island");
    expect(deck.className).toMatch(/w-full/);
    expect(deck.className).toMatch(/min-h-11/);
  });

  it("distributes main group slots evenly with equal flex and ≥44px hit min", () => {
    const { container } = render(
      <ToolDeck>
        <ToolDeckGroup>
          <button type="button" className="jl-tool-slot">
            A
          </button>
          <button type="button" className="jl-tool-slot">
            B
          </button>
          <button type="button" className="jl-tool-slot">
            C
          </button>
        </ToolDeckGroup>
      </ToolDeck>,
    );
    const group = screen.getByLabelText("History and question tools");
    expect(group.className).toMatch(/justify-evenly/);
    expect(group.className).toMatch(/\[&_\.jl-tool-slot\]:flex-1/);
    expect(group.className).toMatch(/\[&_\.jl-tool-slot\]:min-h-11/);
    expect(group.className).toMatch(/\[&_\.jl-tool-slot\]:basis-0/);
    expect(container.querySelectorAll(".jl-tool-slot")).toHaveLength(3);
  });

  it("keeps sparse hunt content-sized instead of forced full bleed", () => {
    render(
      <ToolDeck density="sparse">
        <ToolDeckGroup>
          <button type="button" className="jl-tool-slot">
            Set zone
          </button>
        </ToolDeckGroup>
      </ToolDeck>,
    );
    const deck = screen.getByRole("group", { name: "Hunt tools" });
    expect(deck.getAttribute("data-hunt-density")).toBe("sparse");
    expect(deck.className).toMatch(/w-max/);
    expect(deck.className).not.toMatch(/(?:^|\s)w-full(?:\s|$)/);
  });
});
