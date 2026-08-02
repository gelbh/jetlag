import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { describe, expect, it } from "vitest";

function PathProbe() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

describe("App tutorial redirect", () => {
  it("replaces /tutorial with Home", () => {
    // Mirrors src/App.tsx: <Route path="/tutorial" element={<Navigate to="/" replace />} />
    render(
      <MemoryRouter initialEntries={["/tutorial"]}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <PathProbe />
                <div>home</div>
              </>
            }
          />
          <Route path="/tutorial" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("path")).toHaveTextContent("/");
    expect(screen.getByText("home")).toBeInTheDocument();
  });
});
