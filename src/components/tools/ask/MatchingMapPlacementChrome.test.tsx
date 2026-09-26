import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MantineProvider } from "@mantine/core";
import { jetlagTheme } from "@/theme/theme";
import { MatchingMapPlacementChrome } from "./MatchingMapPlacementChrome";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

function renderChrome(
  props: Partial<ComponentProps<typeof MatchingMapPlacementChrome>> = {},
) {
  const onUseGps = props.onUseGps ?? vi.fn();
  const onCommit = props.onCommit ?? vi.fn();
  const onAnswerChange = props.onAnswerChange ?? vi.fn();
  const onChangeCategory = props.onChangeCategory ?? vi.fn();
  render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MatchingMapPlacementChrome
        categoryLabel="Commercial Airport"
        questionPrompt="Is your nearest commercial airport the same as my nearest commercial airport?"
        costLabel="D3P1"
        phase="locating"
        onUseGps={onUseGps}
        onCommit={onCommit}
        onAnswerChange={onAnswerChange}
        onChangeCategory={onChangeCategory}
        {...props}
      />
    </MantineProvider>,
  );
  return { onUseGps, onCommit, onAnswerChange, onChangeCategory };
}

describe("MatchingMapPlacementChrome", () => {
  it("names the place while resolving once known", () => {
    renderChrome({
      phase: "resolving",
      nearestPlaceName: "Dublin Airport",
    });

    expect(screen.getByTestId("matching-map-placement-status")).toHaveTextContent(
      "Nearest place found",
    );
    expect(screen.getByTestId("matching-map-placement-status")).toHaveTextContent(
      "Dublin Airport",
    );
  });

  it("uses one resolving status for nearest + map loading", () => {
    renderChrome({ phase: "resolving" });

    expect(screen.getByTestId("matching-map-placement-status")).toHaveTextContent(
      "Finding nearest place",
    );
    expect(screen.getByTestId("matching-map-placement-status")).toHaveTextContent(
      "Loading places on the map…",
    );
  });

  it("lets the user reopen the category sheet from the leading back control", () => {
    const { onChangeCategory } = renderChrome({ phase: "answer" });
    fireEvent.click(
      screen.getByRole("button", { name: /Change category/i }),
    );
    expect(onChangeCategory).toHaveBeenCalled();
  });

  it("renders an iOS location CTA with subtitle on failed", () => {
    const { onUseGps } = renderChrome({ phase: "failed" });

    const cta = screen.getByTestId("matching-map-placement-cta");
    expect(cta).toHaveTextContent("Try location again");
    expect(cta).toHaveTextContent("GPS did not lock");
    expect(screen.getByTestId("matching-map-placement-backup")).toHaveTextContent(
      "Or tap the map to set your anchor.",
    );
    fireEvent.click(screen.getByRole("button", { name: /Try location again/i }));
    expect(onUseGps).toHaveBeenCalled();
  });

  it("folds the location error into the retry CTA card", () => {
    renderChrome({
      phase: "failed",
      error: "Location request timed out",
    });

    const cta = screen.getByTestId("matching-map-placement-cta");
    expect(cta).toContainElement(
      screen.getByTestId("matching-map-placement-error"),
    );
    expect(cta).toHaveTextContent("Location timed out");
    expect(cta).toHaveTextContent("Try location again");
    expect(screen.queryByText("GPS did not lock")).toBeNull();
  });

  it("floats Yes / No above the location chrome", () => {
    renderChrome({
      phase: "answer",
      awaitHiderAnswer: false,
      nearestPlaceName: "Dublin Airport",
      answer: null,
    });

    const choices = screen.getByTestId("matching-map-placement-choices");
    const answer = screen.getByTestId("matching-map-placement-answer");
    expect(answer).toContainElement(choices);
    expect(choices).toHaveTextContent("Yes");
    expect(choices).toHaveTextContent("No");
    expect(answer).toHaveTextContent("Dublin Airport");
  });

  it("hides Send until Yes or No is chosen", () => {
    renderChrome({
      phase: "answer",
      awaitHiderAnswer: false,
      nearestPlaceName: "Dublin Airport",
      answer: null,
      canCommit: false,
    });

    expect(
      screen.queryByRole("button", { name: /^Send$/i }),
    ).toBeNull();
  });

  it("puts Yes / No / Send on one row for solo answer", () => {
    const { onAnswerChange, onCommit } = renderChrome({
      phase: "answer",
      awaitHiderAnswer: false,
      nearestPlaceName: "Dublin Airport",
      answer: "yes",
      canCommit: true,
    });

    expect(screen.getByTestId("matching-map-placement-answer")).toHaveTextContent(
      "Dublin Airport",
    );
    fireEvent.click(screen.getByRole("button", { name: /^No$/i }));
    expect(onAnswerChange).toHaveBeenCalledWith("no");
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));
    expect(onCommit).toHaveBeenCalled();
  });

  it("shows Send to hiders when awaitHiderAnswer", () => {
    const { onCommit } = renderChrome({
      phase: "answer",
      awaitHiderAnswer: true,
      nearestPlaceName: "Dublin Airport",
      canCommit: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /^Send to hiders$/i }));
    expect(onCommit).toHaveBeenCalled();
  });
});
