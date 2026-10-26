Original HEAD: 7ac594d32b2c2494df68f28acc5daed8e70ee7c1

Fix:
- MultiPolygon centers now use the largest component.
- Polygon centroids fall back to an outer-ring point when outside.
- Updated the postpass regression test to assert containment.

Verification:
- `node --test functions/test/postpassTranslate.test.mjs` passed: 26 tests.
- Linter diagnostics clean.
- `git diff --check` passed.
