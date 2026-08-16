import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders copy with note role by default", () => {
    render(<EmptyState>No presets match your search.</EmptyState>);
    const node = screen.getByRole("note");
    expect(node).toHaveTextContent("No presets match your search.");
    expect(node).toHaveClass("jl-empty-state");
  });

  it("accepts status role and className", () => {
    render(
      <EmptyState role="status" className="mt-2">
        No activity yet.
      </EmptyState>,
    );
    const node = screen.getByRole("status");
    expect(node).toHaveTextContent("No activity yet.");
    expect(node).toHaveClass("mt-2");
  });
});
