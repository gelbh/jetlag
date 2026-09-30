import { Component, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

const { captureErrorBoundaryExceptionLazy } = vi.hoisted(() => ({
  captureErrorBoundaryExceptionLazy: vi.fn(),
}));

vi.mock("@/services/core/analytics/lazyTelemetry", () => ({
  captureErrorBoundaryExceptionLazy,
}));

class Boom extends Component {
  render(): ReactNode {
    throw new Error("app boom");
  }
}

describe("AppErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <AppErrorBoundary fallback={<p>fallback</p>}>
        <p>content</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(captureErrorBoundaryExceptionLazy).not.toHaveBeenCalled();
  });

  it("renders the fallback and reports the error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary fallback={<p>fallback</p>}>
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByText("fallback")).toBeInTheDocument();
    expect(captureErrorBoundaryExceptionLazy).toHaveBeenCalledWith(
      expect.objectContaining({ message: "app boom" }),
      expect.stringContaining("Boom"),
    );
  });
});
