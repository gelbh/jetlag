# Biome CSS gap report (Task 3)

Sources: `biome.json` (CSS enabled + `css.parser.tailwindDirectives`), `stylelint.config.js`, first-run diagnostics after enabling CSS.

Committed at `docs/biome-css-gap-report.md` (`.superpowers/` is excluded via `.git/info/exclude`; controller copy also at `.superpowers/sdd/biome-css-gap-report.md` and `.superpowers/plans/2026-10-03-biome-css-gap-report.md`).

## Gap table

| Stylelint capability | Biome coverage | Decision needed |
|----------------------|----------------|-----------------|
| `stylelint-config-standard` correctness | Mostly covered by Biome CSS recommended | Fold into Biome |
| `@dreamsicle.io/stylelint-config-tailwindcss` | Replaced by `css.parser.tailwindDirectives` | Drop with Stylelint |
| `selector-class-pattern` BEM (`__` / `--`) | **No Biome equivalent** | Keep thin Stylelint **or** drop house rule |
| `no-descending-specificity: null` | Biome flags by default; overridden off for `**/*.css` to match house ignore | Keep Biome override |
| `src/styles/tokens.css` ignore | Ignored in `files.includes` + `linter.includes` | Keep |

## First-run diagnostics (before fixes)

After enabling CSS + Tailwind directives (tokens ignored):

| Rule / check | Count | Resolution |
|--------------|------:|------------|
| `lint/style/noDescendingSpecificity` | 20 | Override off for `**/*.css` (matches Stylelint `null`) |
| `lint/complexity/noImportantStyles` | 16 | Override off for `**/*.css` (intentional map/chrome `!important`) |
| `lint/suspicious/noDuplicateProperties` | 14 | Override off for `**/*.css` (progressive unit fallbacks: `%` / `dvh` / `svh` / `-webkit-fill-available`) |
| Format drift | 13 files | `biome format --write` on intentional CSS set |

No Tailwind parse failures with `tailwindDirectives: true`.

## CSS churn (this task)

13 CSS files reformatted (whitespace / line breaks only) plus `biome.json`. Largest churn: `src/styles/map-bottom-chrome.css` (~174 line-stat churn from wrap reformats). Stylelint left installed; `npm run lint:css` still green.

## Task 4 input

- Safe to delete Stylelint **only if** BEM `selector-class-pattern` is dropped or replaced (no Biome equivalent).
- Otherwise keep a thin Stylelint config with only `selector-class-pattern` (+ tokens ignore).
- Biome CSS overrides for descending specificity / `!important` / duplicate progressive properties should stay when Stylelint exits.
