import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { RouteTransitionTestProvider } from "./RouteTransitionTestProvider";
import { resetAllStores } from "./helpers/storeReset";

interface RenderWithRouterOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  routerProps?: MemoryRouterProps;
  resetStores?: boolean;
}

export function renderWithRouter(
  ui: ReactElement,
  {
    route = "/",
    routerProps,
    resetStores = true,
    ...options
  }: RenderWithRouterOptions = {},
) {
  if (resetStores) {
    resetAllStores();
  }

  window.history.pushState({}, "", route);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]} {...routerProps}>
        <RouteTransitionTestProvider>{children}</RouteTransitionTestProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
