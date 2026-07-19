import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopContentColumn } from "./DesktopContentColumn";

const useDesktopLayout = vi.fn();
vi.mock("../../hooks/useDesktopLayout", () => ({
  useDesktopLayout: () => useDesktopLayout(),
}));

describe("DesktopContentColumn", () => {
  beforeEach(() => {
    useDesktopLayout.mockReset();
  });

  it("does not constrain width under 1024", () => {
    useDesktopLayout.mockReturnValue(false);
    const { container } = render(
      <DesktopContentColumn>
        <p>body</p>
      </DesktopContentColumn>,
    );
    expect(container.firstElementChild?.className ?? "").not.toMatch(/max-w-/);
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("preserves className under 1024 without max-width", () => {
    useDesktopLayout.mockReturnValue(false);
    const { container } = render(
      <DesktopContentColumn className="flex flex-1">
        <p>body</p>
      </DesktopContentColumn>,
    );
    const root = container.firstElementChild;
    expect(root?.className).toMatch(/flex/);
    expect(root?.className).toMatch(/flex-1/);
    expect(root?.className ?? "").not.toMatch(/max-w-/);
  });

  it("applies 28rem entry max-width on desktop", () => {
    useDesktopLayout.mockReturnValue(true);
    const { container } = render(
      <DesktopContentColumn maxWidth="entry">
        <p>body</p>
      </DesktopContentColumn>,
    );
    expect(container.firstElementChild?.className).toMatch(/max-w-\[28rem\]/);
  });

  it("applies 36rem social max-width on desktop", () => {
    useDesktopLayout.mockReturnValue(true);
    const { container } = render(
      <DesktopContentColumn maxWidth="social">
        <p>body</p>
      </DesktopContentColumn>,
    );
    expect(container.firstElementChild?.className).toMatch(/max-w-\[36rem\]/);
  });
});
