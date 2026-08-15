import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { PhotoCategoryId } from "@/domain/questions";
import { AskHudHost } from "./AskHudHost";
import { PhotoHudBody } from "./PhotoHudBody";
import {
  activeModeCue,
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";

const baseProps = {
  gameSize: "medium" as GameSize,
  distanceUnit: "imperial" as const,
  categoryId: "tree" as PhotoCategoryId,
  usedCategoryIds: new Set<PhotoCategoryId>(),
  onCategoryChange: vi.fn(),
  hasOpenQuestion: false,
};

describe("PhotoHudBody", () => {
  it("renders category picker without CONTINUE sibling", () => {
    render(<PhotoHudBody {...baseProps} />);

    expect(screen.getByTestId("photo-hud-body")).toBeInTheDocument();
    // Medium catalogs exceed chip threshold → short CatalogRail.
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
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
    render(
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
        modeBody={
          <PhotoHudBody
            {...baseProps}
            onCategoryChange={onCategoryChange}
          />
        }
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
