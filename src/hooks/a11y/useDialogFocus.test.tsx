import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { useDialogFocus } from "./useDialogFocus";

function FocusHarness({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, open);
  if (!open) {
    return null;
  }
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Harness">
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  );
}

describe("useDialogFocus", () => {
  it("moves focus into the dialog when active", async () => {
    render(<FocusHarness open />);
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "First" }),
      );
    });
  });

  it("restores focus to the prior element when the dialog unmounts", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Prior";
    document.body.appendChild(outside);
    outside.focus();

    const { rerender } = render(<FocusHarness open />);
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "First" }),
      );
    });

    rerender(<FocusHarness open={false} />);
    await waitFor(() => {
      expect(document.activeElement).toBe(outside);
    });

    outside.remove();
  });

  it("cycles Tab within the dialog", async () => {
    render(<FocusHarness open />);
    const first = await screen.findByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });
    const dialog = screen.getByRole("dialog", { name: "Harness" });

    await waitFor(() => {
      expect(document.activeElement).toBe(first);
    });

    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
