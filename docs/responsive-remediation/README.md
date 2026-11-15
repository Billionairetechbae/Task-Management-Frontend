# User Portal responsive and accessibility remediation: verification

Branch `feature/portal-responsive-accessibility` (from `staging`). Frontend only. Verified locally against a **mock API with fake data** (no real API, credentials or backend touched).

## How zoom, viewport and font size were emulated (they are different things)
| Setting | Emulation | Effect |
|---|---|---|
| Browser page zoom Z | window W×H, CSS viewport (W/Z)×(H/Z), devicePixelRatio Z | fewer CSS px, everything scales |
| Reduced window | CSS viewport only | fewer CSS px |
| Browser default font size | Chrome profile pref `default_font_size` (24px / 32px), viewport unchanged | rem grows, `rem` media queries move, px does not |

Effective dimensions are in `before/` and `after/` filenames; exact values: 1920×1080 at 67/100/110/125/150/175/200% = 2866, 1920, 1745, 1536, 1280, 1097, 960 CSS px wide.

## Screenshots
`before/` = pristine `staging`; `after/` = this branch. Same names: `1920-z100`, `1920-z125`, `1920-z150`, `1920-z200`, `1280-z100`, `1024`, `768`, `390`, `320`, `1920-font200` (real 32px default font).

## Results
- Dashboard interaction suite (filters, search, pagination, row actions, drawer, dialogs, sidebar collapse/drawer, account menu, 30-stop keyboard walk, 5 s idle request-loop check, console errors) passes at 1920, 1536, 1366, 1280, 1024, 960, 768, 390, 320 CSS px. Only known exception: the Support launcher can float over a row action while scrolling (focus is auto-nudged clear).
- Route smoke (`route-smoke-*.json`): 32 routes × 4 settings (1280, 200% zoom, 390, 200% default font). Detectors: horizontal overflow outside scroll regions, text spilling out of its box, controls covered by other elements, crashes.
- axe-core (WCAG 2.0/2.1/2.2 A+AA tags) on Dashboard, Projects, Time, Workload, Calendar, All Tasks at 1280 and 390: button-name 390 → 0, target-size 63 → 0, aria-allowed-attr 6 → 0, link-name 1 → 0, color-contrast 176 → 126.
- tsc: 38 errors before and after. eslint: 1077 problems before and after. vitest: same failing set as `staging` (connected-storage-comments, phase5b-workspace, build-environment script).

## Known limitations
See the final report: badge colour contrast, Support launcher overlap, removed rail drag-resize, mock-data caveats.
