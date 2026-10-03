import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAP_NOTICE_DURATION_MS } from "@/domain/ui/mapNoticeLifetime";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AppUpdateMapChip } from "./AppUpdateMapChip";

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: vi.fn(() => ({
    showMapChip: true,
    dismissDeferred: vi.fn(),
  })),
}));

describe("AppUpdateMapChip", () => {
  it("anchors in the top status lane without bottom dock class", () => {
    const { container } = renderWithAppUi(<AppUpdateMapChip />);
    expect(screen.getByText(/update waiting/i)).toBeInTheDocument();
    const html = container.innerHTML;
    expect(html).not.toMatch(/jl-app-update-chip/);
    expect(html).toMatch(/mt-1\.5/);
  });

  it("auto-dismisses after updateWaiting duration", () => {
    vi.useFakeTimers();
    const dismissDeferred = vi.fn();
    vi.mocked(useAppUpdateState).mockReturnValue({
      showMapChip: true,
      dismissDeferred,
    } as unknown as ReturnType<typeof useAppUpdateState>);

    renderWithAppUi(<AppUpdateMapChip />);
    vi.advanceTimersByTime(MAP_NOTICE_DURATION_MS.updateWaiting);
    expect(dismissDeferred).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
