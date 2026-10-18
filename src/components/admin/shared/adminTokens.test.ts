import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "adminTokens.css"), "utf8");
const worldBlock = css.slice(
  css.indexOf("[data-admin-world] {"),
  css.indexOf("}", css.indexOf("[data-admin-world] {")),
);

describe("admin tokens", () => {
  it("is dark only and loads no extra font", () => {
    expect(css).not.toContain("light-dark(");
    expect(css).not.toMatch(/archivo/i);
    expect(worldBlock).toContain("color-scheme: dark;");
  });

  it.each([
    ["--adm-paper", "var(--color-surface-deep)"],
    ["--adm-paper-raised", "var(--color-canvas)"],
    ["--adm-ink", "var(--color-ink)"],
    ["--adm-ink-muted", "var(--color-ink-muted)"],
    ["--adm-rule", "var(--color-rule)"],
    ["--adm-overprint", "var(--color-flag)"],
    ["--adm-overprint-ink", "var(--color-flag-ink)"],
    ["--adm-overprint-soft", "var(--color-flag-soft)"],
    ["--adm-live", "var(--color-signal-soft)"],
    ["--adm-ok", "var(--color-trail)"],
    ["--adm-info", "var(--color-brand-blue)"],
    ["--adm-mispunch", "var(--color-status-error)"],
    ["--adm-font", "var(--font-body)"],
  ])("maps %s to %s", (role, value) => {
    expect(worldBlock).toContain(`${role}: ${value};`);
  });

  it("no longer overrides player tokens inside the admin world", () => {
    expect(worldBlock).not.toMatch(/^\s*--color-[a-z-]+:/m);
  });
});
