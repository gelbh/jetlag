import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShareCode } from "./ShareCode";
import { renderWithRouter } from "../../test/renderWithRouter";

describe("ShareCode", () => {
  it("displays the session code", () => {
    renderWithRouter(<ShareCode code="WXYZ" remote />);
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
    expect(
      screen.getByText("Give this code to your team."),
    ).toBeInTheDocument();
  });
});
