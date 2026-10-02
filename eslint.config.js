import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import playwright from "eslint-plugin-playwright";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    "worker-configuration.d.ts",
    "crates/*/pkg/**",
    "target/**",
    "**/yqrd-*.test.ts",
    // Sibling git worktrees must not be linted from the primary clone.
    ".worktrees/**",
  ]),
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
    },
  },
  {
    files: ["src/test/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["worker/**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["e2e/**/*.{ts,tsx}"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      // Sleeps must fail CI (recommended defaults to warn).
      "playwright/no-wait-for-timeout": "error",
      "playwright/expect-expect": [
        "error",
        {
          // eslint-plugin-playwright@2.x: wildcards live in assertFunctionPatterns
          // (assertFunctionNames is exact-match only). Prefer tight prefixes / concrete
          // multiplayer helpers over broad ^run / ^send.
          assertFunctionPatterns: [
            "^assert",
            "^complete",
            "^confirm",
            "^draw",
            "^expect",
            "^place",
            "^redo",
            "^undo",
            "^waitFor",
            "^runHiderAnswerFlow$",
            "^sendRadarToHiders$",
            "^sendMatchingToHiders$",
            "^sendMeasuringToHiders$",
            "^sendThermometerToHiders$",
            "^sendTentacleToHiders$",
          ],
        },
      ],
    },
  },
  // Wave 1: enable jsx-a11y recommended on kernel/flag surfaces only.
  // Expand this glob as later UX waves migrate chrome (avoid repo-wide debt gate).
  {
    files: [
      "src/components/ui/sheets/SheetHost.tsx",
      "src/components/ui/sheets/SheetHost.test.tsx",
      "src/components/ui/sheets/MantineDrawerSheet.tsx",
      "src/components/ui/brand/JlIcon.tsx",
      "src/components/tools/ToolDockOverflowMenu.tsx",
      "src/hooks/feature/**/*.{ts,tsx}",
    ],
    extends: [jsxA11y.flatConfigs.recommended],
  },
  {
    files: ["worker/**/*.ts"],
    ignores: ["worker/**/*.test.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.serviceworker,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/domain/geometry/kernel/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "leaflet",
              message: "geometry kernel must stay Leaflet-free",
            },
            {
              name: "react",
              message: "geometry kernel must stay React-free",
            },
            {
              name: "firebase/app",
              message: "geometry kernel must stay Firebase-free",
            },
          ],
          patterns: [
            {
              group: ["**/map/annotations", "**/map/annotations.*"],
              message:
                "geometry kernel must not import AnnotationRecord/GameArea module; use GameAreaGeometry",
            },
            {
              group: ["**/session/hidingZone", "**/session/hidingZone.*"],
              message: "geometry kernel must not import session records",
            },
          ],
        },
      ],
    },
  },
]);
