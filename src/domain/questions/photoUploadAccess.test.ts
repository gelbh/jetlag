import { describe, expect, it } from "vitest";
import { formatDistance } from "../map/distance";
import { photoUploadAccessError } from "./photoUploadAccess";

describe("formatDistance metric", () => {
  it("formats whole kilometers without decimals", () => {
    expect(formatDistance(2000, "metric")).toBe("2 km");
    expect(formatDistance(1000, "metric")).toBe("1 km");
  });

  it("keeps one decimal for fractional kilometers", () => {
    expect(formatDistance(1500, "metric")).toBe("1.5 km");
  });
});

describe("photoUploadAccessError", () => {
  it("allows hiders with member roles", () => {
    expect(
      photoUploadAccessError(
        {
          memberUids: ["hider-1"],
          memberRoles: { "hider-1": "hider" },
        },
        "hider-1",
      ),
    ).toBeNull();
  });

  it("blocks legacy sessions without member roles", () => {
    expect(
      photoUploadAccessError(
        {
          memberUids: ["hider-1"],
          memberRoles: undefined,
        },
        "hider-1",
      ),
    ).toMatch(/role tracking|new session/i);
  });

  it("blocks seekers", () => {
    expect(
      photoUploadAccessError(
        {
          memberUids: ["seeker-1"],
          memberRoles: { "seeker-1": "seeker" },
        },
        "seeker-1",
      ),
    ).toMatch(/Only hiders/i);
  });
});
