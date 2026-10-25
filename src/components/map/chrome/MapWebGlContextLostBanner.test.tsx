import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapWebGlContextLostBanner } from "./MapWebGlContextLostBanner";

describe("MapWebGlContextLostBanner", () => {
  it("renders Retry and Reload actions", () => {
    const onRetry = vi.fn();
    const onReload = vi.fn();

    render(<MapWebGlContextLostBanner visible onRetry={onRetry} onReload={onReload} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/graphics context/i);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    fireEvent.click(screen.getByRole("button", { name: /reload/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when not visible", () => {
    const { container } = render(
      <MapWebGlContextLostBanner visible={false} onRetry={() => {}} onReload={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
