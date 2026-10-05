import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { AskMapPlacementChrome } from "./AskMapPlacementChrome";

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
  props: Partial<ComponentProps<typeof AskMapPlacementChrome>> &
    Pick<ComponentProps<typeof AskMapPlacementChrome>, "phase">,
) {
  const onUseGps = props.onUseGps ?? vi.fn();
  render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <AskMapPlacementChrome
        testId="matching-map-placement"
        toolTitle="Matching"
        configureLabel="Commercial Airport"
        questionPrompt="Is your nearest commercial airport the same?"
        onUseGps={onUseGps}
        statusTitle="Finding location"
        statusBody="Waiting for GPS…"
        toolIcon={<span />}
        answerSlot={<div data-testid="answer-slot">answers</div>}
        {...props}
      />
    </MantineProvider>,
  );
  return { onUseGps };
}

describe("AskMapPlacementChrome answer-phase errors", () => {
  it("shows inline error detail when phase is answer", () => {
    renderChrome({
      testId: "measuring-map-placement",
      toolTitle: "Measuring",
      configureLabel: "Museum",
      questionPrompt: "Is it closer or further?",
      phase: "answer",
      error: "Couldn't save this measuring question.",
      statusTitle: "",
      statusBody: "",
    });

    const alert = screen.getByTestId("measuring-map-placement-answer-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert.textContent).toMatch(/Couldn't save this measuring question/i);
    expect(screen.getByTestId("answer-slot")).toBeInTheDocument();
  });
});

describe("AskMapPlacementChrome answer-phase GPS snap", () => {
  it("shows My location snap control above answerSlot and calls onUseGps", () => {
    const { onUseGps } = renderChrome({ phase: "answer" });

    const snap = screen.getByTestId("matching-map-placement-snap-location");
    expect(snap).toHaveAccessibleName("Snap pin to my location");
    expect(snap).toHaveTextContent("My location");
    expect(snap.textContent).not.toMatch(/Allow location when prompted/i);

    const answerSlot = screen.getByTestId("answer-slot");
    expect(
      snap.compareDocumentPosition(answerSlot) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(snap);
    expect(onUseGps).toHaveBeenCalledTimes(1);
  });

  it("hides snap control during locating (not the tall permission CTA)", () => {
    renderChrome({ phase: "locating", answerSlot: undefined });

    expect(screen.queryByTestId("matching-map-placement-snap-location")).toBeNull();
    expect(screen.queryByTestId("matching-map-placement-cta")).toBeNull();
    expect(screen.queryByText("Allow location when prompted")).toBeNull();
    expect(screen.queryByRole("button", { name: /My location/i })).toBeNull();
  });
});
