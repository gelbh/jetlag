import { fireEvent, screen } from "@testing-library/react";

export async function pickCreateSessionPreset(presetName: RegExp | string) {
  const combobox = screen.getByRole("combobox", { name: /game preset/i });
  fireEvent.click(combobox);
  if (typeof presetName === "string") {
    fireEvent.input(combobox, { target: { value: presetName } });
  }
  const option = await screen.findByRole("option", { name: presetName, hidden: true });
  fireEvent.click(option);
}
