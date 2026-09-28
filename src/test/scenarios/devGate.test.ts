import { describe, expect, it } from "vitest";
import { isDevScenariosEnabled } from "./devGate";

describe("isDevScenariosEnabled", () => {
  it("is true when DEV", () => {
    expect(isDevScenariosEnabled({ dev: true, emulator: false })).toBe(true);
  });

  it("is true when emulator", () => {
    expect(isDevScenariosEnabled({ dev: false, emulator: true })).toBe(true);
  });

  it("is false when neither DEV nor emulator", () => {
    expect(isDevScenariosEnabled({ dev: false, emulator: false })).toBe(false);
  });
});
