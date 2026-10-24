import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeriesChrome } from "./SeriesChrome";

describe("SeriesChrome", () => {
  it("renders nothing when inactive (classic)", () => {
    const { container } = render(
      <SeriesChrome active={false} seriesLength={1} gameIndex={1} score={{ teamA: 0, teamB: 0 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows BO3 pennants and game index", () => {
    render(
      <SeriesChrome
        active
        seriesLength={3}
        gameIndex={2}
        score={{ teamA: 1, teamB: 0 }}
        phase="siege"
      />,
    );
    expect(screen.getByTestId("castle-siege-series-chrome")).toBeInTheDocument();
    expect(screen.getByTestId("castle-siege-series-mast")).toHaveTextContent(/Siege · BO3/);
    expect(screen.getByTestId("castle-siege-series-pennants")).toHaveTextContent(/1/);
    expect(screen.getByTestId("castle-siege-series-pennants")).toHaveTextContent(/Game 2/);
  });

  it("shows between-games mast and host continue", () => {
    const onContinue = vi.fn();
    render(
      <SeriesChrome
        active
        seriesLength={3}
        gameIndex={2}
        score={{ teamA: 1, teamB: 0 }}
        phase="betweenGames"
        isHost
        onContinueSeries={onContinue}
      />,
    );
    expect(screen.getByTestId("castle-siege-series-mast")).toHaveTextContent(/Between games/);
    expect(screen.getByTestId("castle-siege-series-continue")).toBeInTheDocument();
  });

  it("shows match complete when seriesOutcome is set", () => {
    render(
      <SeriesChrome
        active
        seriesLength={1}
        gameIndex={1}
        score={{ teamA: 1, teamB: 0 }}
        phase="siege"
        seriesOutcome="complete"
      />,
    );
    expect(screen.getByTestId("castle-siege-series-mast")).toHaveTextContent(/Match complete/);
  });
});
