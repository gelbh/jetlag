import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlobalActivity } from "./GlobalActivity";

describe("GlobalActivity", () => {
  it("hides when idle", () => {
    const { container } = render(<GlobalActivity />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows when pendingWrites > 0", () => {
    render(<GlobalActivity pendingWrites={2} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saving 2…");
  });

  it("shows when settling", () => {
    render(<GlobalActivity settling />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });
});
