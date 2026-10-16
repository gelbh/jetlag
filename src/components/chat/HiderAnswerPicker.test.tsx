import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../test/renderWithAppUi";
import { HiderAnswerPicker } from "./HiderAnswerPicker";

const replyOptions = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];

function renderPicker(props: Partial<Parameters<typeof HiderAnswerPicker>[0]>) {
  return renderWithAppUi(
    <HiderAnswerPicker
      replyOptions={replyOptions}
      truth={null}
      loading={false}
      truthReferenceMode="hidingZoneCenter"
      onSelect={vi.fn()}
      {...props}
    />,
  );
}

describe("HiderAnswerPicker", () => {
  it("offers only the true reply when truth is known", () => {
    renderPicker({ truth: { replyId: "yes", label: "Yes" } });
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^No/ })).toBeNull();
  });

  it("offers no replies while truth is loading", () => {
    renderPicker({ loading: true });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps a stale true reply visible but inert while truth refetches", () => {
    const onSelect = vi.fn();
    renderPicker({ truth: { replyId: "yes", label: "Yes" }, loading: true, onSelect });
    const button = screen.getByRole("button", { name: "Yes" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("offers every reply when truth is unavailable", () => {
    renderPicker({ truth: { replyId: "", label: "Truth unavailable.", unavailable: true } });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("offers every reply when truth matches no option", () => {
    renderPicker({ truth: { replyId: "closer", label: "Closer" } });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("replaces replies with a set-zone prompt when the hider has no zone", () => {
    const onSetHidingZone = vi.fn();
    renderPicker({ truthReferenceMode: "noHidingZone", loading: true, onSetHidingZone });
    expect(screen.getByText("Set your hiding zone to answer.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "No" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Set hiding zone" }));
    expect(onSetHidingZone).toHaveBeenCalledTimes(1);
  });

  it("keeps manual replies during end game without an anchor", () => {
    renderPicker({
      truthReferenceMode: "unavailable",
      truth: { replyId: "", label: "Truth unavailable.", unavailable: true },
    });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
