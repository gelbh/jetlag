import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BusyRegion } from "./BusyRegion";

describe("BusyRegion", () => {
  it("sets aria-busy and shows skeleton while busy", () => {
    render(
      <BusyRegion busy skeleton={<p>Loading skeleton</p>}>
        <p>Content</p>
      </BusyRegion>,
    );

    expect(screen.getByText("Loading skeleton").parentElement).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("shows children when not busy", () => {
    render(
      <BusyRegion busy={false} skeleton={<p>Loading skeleton</p>}>
        <p>Content</p>
      </BusyRegion>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.queryByText("Loading skeleton")).not.toBeInTheDocument();
  });
});
