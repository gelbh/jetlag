import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  HIDING_ZONE_CREATE_WIZARD,
  HIDING_ZONE_MOVE_WIZARD,
  MATCHING_WIZARD,
} from "../../domain/wizard/toolWizardPhases";
import { useToolWizard } from "./useToolWizard";

describe("useToolWizard phase API", () => {
  it("advances configure continuum before ask for matching", () => {
    const { result } = renderHook(() => useToolWizard(MATCHING_WIZARD));

    expect(result.current.phaseId).toBe("place");
    expect(result.current.configureIndex).toBe(0);
    expect(result.current.stepId).toBe("place");

    act(() => {
      result.current.goNext();
    });
    expect(result.current.phaseId).toBe("configure");
    expect(result.current.configureIndex).toBe(0);
    expect(result.current.stepId).toBe("category");

    act(() => {
      result.current.goNext();
    });
    expect(result.current.phaseId).toBe("configure");
    expect(result.current.configureIndex).toBe(1);
    expect(result.current.stepId).toBe("resolve");

    act(() => {
      result.current.goNext();
    });
    expect(result.current.phaseId).toBe("ask");
    expect(result.current.stepId).toBe("ask");

    act(() => {
      result.current.goBack();
    });
    expect(result.current.phaseId).toBe("configure");
    expect(result.current.configureIndex).toBe(1);

    act(() => {
      result.current.goBack();
    });
    expect(result.current.phaseId).toBe("configure");
    expect(result.current.configureIndex).toBe(0);

    act(() => {
      result.current.goBack();
    });
    expect(result.current.phaseId).toBe("place");
  });

  it("starts on configure for hiding zone create", () => {
    const { result } = renderHook(() => useToolWizard(HIDING_ZONE_CREATE_WIZARD));

    expect(result.current.phaseId).toBe("configure");
    expect(result.current.stepId).toBe("method");
  });

  it("skips empty configure when moving a hiding zone", () => {
    const { result } = renderHook(() => useToolWizard(HIDING_ZONE_MOVE_WIZARD));

    expect(result.current.phaseId).toBe("place");

    act(() => {
      result.current.goNext();
    });
    expect(result.current.phaseId).toBe("ask");
  });
});
