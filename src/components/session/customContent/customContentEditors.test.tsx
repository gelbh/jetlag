import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultAdvancedSessionSettings } from "@/domain/session/tools/advancedSessionSettings";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { CategoryEditor } from "./CategoryEditor";
import { PinEditor } from "./PinEditor";

describe("custom content draft fields", () => {
  it("accepts multi-character typing in custom POI fields", () => {
    renderWithAppUi(
      <CategoryEditor
        value={defaultAdvancedSessionSettings("medium", "metric")}
        onChange={vi.fn()}
      />,
    );

    for (const name of [/label/i, /prompt noun/i, /overpass selectors/i]) {
      const field = screen.getByRole("textbox", { name });
      fireEvent.change(field, { target: { value: "a" } });
      fireEvent.change(field, { target: { value: "ab" } });
      fireEvent.change(field, { target: { value: "abc" } });
      expect(field).toHaveValue("abc");
    }
  });

  it("accepts multi-character typing in custom pin fields", () => {
    renderWithAppUi(
      <PinEditor value={defaultAdvancedSessionSettings("medium", "metric")} onChange={vi.fn()} />,
    );

    for (const name of [/name/i, /latitude/i, /longitude/i]) {
      const field = screen.getByRole("textbox", { name });
      fireEvent.change(field, { target: { value: "1" } });
      fireEvent.change(field, { target: { value: "12" } });
      fireEvent.change(field, { target: { value: "123" } });
      expect(field).toHaveValue("123");
    }
  });
});
