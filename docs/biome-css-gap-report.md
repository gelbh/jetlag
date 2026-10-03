# Biome CSS decision

Biome owns JS/TS/CSS lint and format (`npm run lint` / `npm run format`). Stylelint is removed.

- Tailwind v4: `css.parser.tailwindDirectives: true` in `biome.json`.
- Generated `src/styles/tokens.css` is ignored.
- BEM `selector-class-pattern` is not enforced (full-drop; convention-only). See `CONTRIBUTING.md`.
- Intentional CSS rule offs for all `**/*.css`: `noDescendingSpecificity`, `noImportantStyles`, `noDuplicateProperties`.
