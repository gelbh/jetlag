import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
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
    },
  },
  {
    files: ["worker/**/*.ts"],
    ignores: ["worker/**/*.test.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.serviceworker,
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
