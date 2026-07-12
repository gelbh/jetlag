import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RolePicker } from "./RolePicker";

vi.mock("../ui/RadioCardGroup", () => ({
  RadioCardGroup: ({
    options,
    label,
  }: {
    options: Array<{ title: string; description: string }>;
    label: string;
  }) => (
    <div>
      <p>{label}</p>
      <ul>
        {options.map((option) => (
          <li key={option.title}>
            {option.title}: {option.description}
          </li>
        ))}
      </ul>
    </div>
  ),
}));

describe("RolePicker", () => {
  it("shows seeker and hider by default", () => {
    render(
      <RolePicker value="seeker" onChange={() => undefined} />,
    );

    expect(screen.getByText(/Seeker:/)).toBeInTheDocument();
    expect(screen.getByText(/Hider:/)).toBeInTheDocument();
    expect(screen.queryByText(/Observer:/)).not.toBeInTheDocument();
  });

  it("includes observer when requested", () => {
    render(
      <RolePicker
        value="observer"
        onChange={() => undefined}
        includeObserver
      />,
    );

    expect(screen.getByText(/Observer:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Switch between seeker and hider views/i),
    ).toBeInTheDocument();
  });
});
