import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "adminShell.css"), "utf8");

describe("admin shell CSS", () => {
  it("uses player tokens only (no admin alias vars or Archivo)", () => {
    expect(css).not.toMatch(/--adm-[a-z]/);
    expect(css).not.toMatch(/archivo/i);
    expect(css).not.toContain("light-dark(");
    expect(css).toContain("color-scheme: dark;");
  });

  it("keeps a focus-visible ring on unstyled desk controls", () => {
    expect(css).toContain(".admin-unstyled-control:focus-visible");
    expect(css).toContain("outline: 2px solid var(--color-flag)");
  });
});
