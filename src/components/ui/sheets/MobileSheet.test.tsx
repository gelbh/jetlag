import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileSheet } from "./MobileSheet";

describe("MobileSheet split footer", () => {
  it("renders footer outside the sheet-owned scroll body", () => {
    render(
      <MobileSheet
        variant="nested"
        layout="split"
        maxHeightClassName="max-h-[200px]"
        footer={<div data-testid="footer">footer</div>}
      >
        <div data-testid="body">body</div>
      </MobileSheet>,
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
      <MobileSheet
        variant="nested"
        layout="split"
        pinned={<div data-testid="pinned">pinned</div>}
        maxHeightClassName="max-h-[200px]"
      >
        <div data-testid="body">body</div>
      </MobileSheet>,
    );

    const body = screen.getByTestId("body");
    const pinned = screen.getByTestId("pinned");
    const scroller = body.parentElement;
    expect(scroller?.className).toMatch(/overflow-y-auto/);
    expect(scroller?.contains(pinned)).toBe(false);
  });
});
