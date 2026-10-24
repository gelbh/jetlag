import { fireEvent } from "@testing-library/react";
import { expect, type Mock } from "vitest";

/** Shared asserts for EntryAsyncButton unavailable/busy primary CTAs. */
export function expectUnavailablePrimary(button: HTMLElement, onCommit: Mock): void {
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onCommit).not.toHaveBeenCalled();
}

export function expectBusyPrimary(button: HTMLElement, onCommit: Mock): void {
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).not.toBeDisabled();
  fireEvent.click(button);
  expect(onCommit).not.toHaveBeenCalled();
}
