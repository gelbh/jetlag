import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AskHudReadiness,
  activeModeCue,
  canCommit,
  primedCommitLabel,
} from "@/domain/ask/askHudModes";
import type { PhotoCategoryId } from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";
import { jetlagTheme } from "@/theme/theme";
import { AskHudHost } from "./AskHudHost";
import { PhotoHudBody } from "./PhotoHudBody";

const baseProps = {
  gameSize: "medium" as GameSize,
  distanceUnit: "imperial" as const,
  categoryId: "tree" as PhotoCategoryId,
  usedCategoryIds: new Set<PhotoCategoryId>(),
  onCategoryChange: vi.fn(),
  hasOpenQuestion: false,
};

function renderPhoto(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

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

describe("PhotoHudBody", () => {
  it("renders category picker without CONTINUE sibling", () => {
    renderPhoto(<PhotoHudBody {...baseProps} />);

    expect(screen.getByTestId("photo-hud-body")).toBeInTheDocument();
    // Medium catalogs exceed chip threshold → short CatalogRail.
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
  });

  it("keeps used categories visible but disabled", () => {
    renderPhoto(<PhotoHudBody {...baseProps} usedCategoryIds={new Set(["tree"])} />);
    expect(screen.getByText("Tree")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tree" })).toBeDisabled();
  });

  it("arms PrimedCommitStrip only when configureReady via AskHudHost", () => {
    const muted: AskHudReadiness = {
      surface: "photo",
      placementReady: true,
      configureReady: false,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    expect(canCommit(muted)).toBe(false);
    expect(
      activeModeCue({
        surface: "photo",
        placementReady: true,
        configureReady: false,
        resolveReady: true,
      }),
    ).toBe("PICK A PHOTO ASK");

    const primed: AskHudReadiness = {
      ...muted,
      configureReady: true,
    };
    expect(canCommit(primed)).toBe(true);

    const onCommit = vi.fn();
    const onCategoryChange = vi.fn();
    renderPhoto(
      <AskHudHost
        cue="READY TO SEND"
        toolLabel="Photo"
        costLabel="D1P1"
        canCommit
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D1P1",
          primed: true,
          cue: "READY TO SEND",
        })}
        onCommit={onCommit}
        modeBody={<PhotoHudBody {...baseProps} onCategoryChange={onCategoryChange} />}
      />,
    );

    expect(screen.getByTestId("ask-commit-strip").querySelector("button")).toHaveAttribute(
      "data-armed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "SEND · D1P1" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
