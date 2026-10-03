import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NestedSplitLayout } from "./NestedSplitLayout";

describe("NestedSplitLayout", () => {
  it("renders footer outside the sheet-owned scroll body", () => {
    render(
      <NestedSplitLayout
        maxHeightClassName="max-h-[200px]"
        footer={<div data-testid="footer">footer</div>}
      >
        <div data-testid="body">body</div>
      </NestedSplitLayout>,
    );

    const body = screen.getByTestId("body");
    const footer = screen.getByTestId("footer");
    const scroller = body.parentElement;
    expect(scroller?.className).toMatch(/overflow-y-auto/);
    expect(scroller?.contains(footer)).toBe(false);
    // Wrapper (shrink-0 bg-canvas) is the scroller sibling; footer lives inside it.
    expect(footer.parentElement).toBe(scroller?.nextElementSibling);
    expect(footer.parentElement?.className).toMatch(/shrink-0/);
  });

  it("keeps pinned header outside the scroll body", () => {
    render(
      <NestedSplitLayout
        pinned={<div data-testid="pinned">pinned</div>}
        maxHeightClassName="max-h-[200px]"
      >
        <div data-testid="body">body</div>
      </NestedSplitLayout>,
    );

    const body = screen.getByTestId("body");
    const pinned = screen.getByTestId("pinned");
    const scroller = body.parentElement;
    expect(scroller?.className).toMatch(/overflow-y-auto/);
    expect(scroller?.contains(pinned)).toBe(false);
  });

  it("keeps nested chassis in-flow (not a fixed bottom overlay)", () => {
    const { container } = render(
      <NestedSplitLayout maxHeightClassName="max-h-[200px]">
        <div data-testid="body">body</div>
      </NestedSplitLayout>,
    );

    const chassis = container.firstElementChild;
    expect(chassis?.className).toMatch(/\brelative\b/);
    expect(chassis?.className).toMatch(/\bmin-h-0\b/);
    expect(chassis?.className).not.toMatch(/\bfixed\b/);
    expect(chassis?.className).not.toMatch(/\binset-x-0\b/);
    expect(chassis?.className).not.toMatch(/\bbottom-0\b/);
  });
});
