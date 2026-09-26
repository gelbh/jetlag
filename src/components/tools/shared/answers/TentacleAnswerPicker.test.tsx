import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import type { TentaclePoi } from "@/domain/map/annotations";
import { TentacleAnswerPicker } from "./TentacleAnswerPicker";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

const pois: TentaclePoi[] = [
  {
    id: "poi-1",
    name: "Irish Jewish Museum",
    lat: 53.33,
    lng: -6.27,
    category: "museum",
  },
  {
    id: "poi-2",
    name: "Guinness Storehouse",
    lat: 53.34,
    lng: -6.28,
    category: "museum",
  },
];

const baseProps = {
  poiOptions: pois,
  selectedPoiId: null as string | null,
  outOfReach: false,
  onSelectPoi: vi.fn(),
  onOutOfReachChange: vi.fn(),
};

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
  baseProps.onSelectPoi = vi.fn();
  baseProps.onOutOfReachChange = vi.fn();
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

describe("TentacleAnswerPicker", () => {
  it("keeps Survey Answer / In progress chrome when flag is off", () => {
    render(<TentacleAnswerPicker {...baseProps} />);

    expect(screen.getByText("Answer")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy for hider/i })).toBeNull();
    expect(screen.getByText("Irish Jewish Museum")).toBeInTheDocument();
  });

  it("uses iOS Mantine choice list without Survey section chrome when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <TentacleAnswerPicker {...baseProps} />
      </MantineProvider>,
    );

    const root = screen.getByTestId("tentacle-answer-picker");
    expect(root.getAttribute("data-player-ux-world")).toBe("mantine");
    expect(screen.queryByText("Answer")).toBeNull();
    expect(screen.queryByText("In progress")).toBeNull();
    expect(screen.getByText("Choose one")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy for hider/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Irish Jewish Museum" }));
    expect(baseProps.onSelectPoi).toHaveBeenCalledWith("poi-1");

    fireEvent.click(screen.getByRole("button", { name: /Not within reach/i }));
    expect(baseProps.onOutOfReachChange).toHaveBeenCalledWith(true);
  });
});
