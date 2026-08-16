import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

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
  // Wave 1: enable jsx-a11y recommended on kernel/flag surfaces only.
  // Expand this glob as later UX waves migrate chrome (avoid repo-wide debt gate).
  {
    files: [
      "src/components/ui/sheets/RacMotionSheet.tsx",
      "src/components/ui/sheets/RacMotionSheet.test.tsx",
      "src/components/ui/sheets/SheetHost.tsx",
      "src/components/ui/sheets/SheetHost.test.tsx",
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
