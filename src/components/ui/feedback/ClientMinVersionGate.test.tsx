import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientMinVersionGate } from "./ClientMinVersionGate";

const subscribeMock = vi.fn();

vi.mock("@/hooks/app/useAuthBootstrapReady", () => ({
  useAuthBootstrapReady: () => true,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock("@/domain/device/changelog", () => ({
  APP_VERSION: "0.10.8",
}));

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: () => ({
    applyUpdate: vi.fn(),
    inActiveMapSession: false,
    safeToReload: true,
    showMapChip: false,
    showGlobalBanner: false,
    dismissDeferred: () => {},
    hotfixGraceActive: false,
    hotfixGraceSecondsRemaining: null,
    hotfixRequiredMinAppVersion: null,
  }),
}));

vi.mock("@/services/firestore/clientMinVersion", () => ({
  subscribeClientMinVersion: (
    onChange: (min: string | null) => void,
    _onError: (error: Error) => void,
  ) => {
    subscribeMock(onChange);
    return () => {};
  },
}));

describe("ClientMinVersionGate", () => {
  beforeEach(() => {
    subscribeMock.mockReset();
  });

  it("blocks with update-required UI when below global min", () => {
    subscribeMock.mockImplementation((onChange: (min: string | null) => void) => {
      onChange("0.11.0");
    });

    render(
      <ClientMinVersionGate>
        <div>app-content</div>
      </ClientMinVersionGate>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/Update required/i);
    expect(screen.queryByText("app-content")).toBeNull();
  });

  it("renders children when at or above min", () => {
    subscribeMock.mockImplementation((onChange: (min: string | null) => void) => {
      onChange("0.10.0");
    });

    render(
      <ClientMinVersionGate>
        <div>app-content</div>
      </ClientMinVersionGate>,
    );

    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("fail-opens when min doc is missing", () => {
    subscribeMock.mockImplementation((onChange: (min: string | null) => void) => {
      onChange(null);
    });

    render(
      <ClientMinVersionGate>
        <div>app-content</div>
      </ClientMinVersionGate>,
    );

    expect(screen.getByText("app-content")).toBeInTheDocument();
  });
});
