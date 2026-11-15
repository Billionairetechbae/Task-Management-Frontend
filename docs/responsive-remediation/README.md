# User Portal responsive and accessibility remediation: verification

Branch `feature/portal-responsive-accessibility` (from `staging`). Frontend only. All verification ran locally in real Chrome against a **mock API with sanitized fixtures** (no real API, credentials or customer data).

## Emulation (zoom, window size and font size are different things)
| Setting | Emulation |
|---|---|
| Browser page zoom Z | window W×H → CSS viewport (W/Z)×(H/Z), devicePixelRatio Z |
| Reduced window | CSS viewport only |
| Browser default font size | Chrome profile pref `default_font_size` 24px / 32px (moves rem, rem media queries) |

1920×1080 at 67/100/110/125/150/175/200% = 2866/1920/1745/1536/1280/1097/960 CSS px wide.

## Fixtures (sanitized)
500 tasks; 40 projects (some with 80-char names); long user names (e.g. 40 chars) and a 75-char workspace name; 1-3 assignees per task; statuses pending / in_progress / in_review / completed / delayed / cancelled / on_hold / blocked_by_vendor; owner / admin / manager / member roles; empty and delayed-loading states.

## Screenshots
`before/` = pristine `staging`; `after/` = final branch (same names). `states/` = empty and loading. `roles/` = admin, manager, member.

## Results
| Check | Result |
|---|---|
| axe-core WCAG 2.0/2.1/2.2 A+AA, 6 pages × 2 widths, light theme (large fixture) | previous commit 1,638 colour-contrast (+0 other) → **0** |
| same, dark theme, Dashboard | 15 → 8 (all remaining are `text-primary`, not badge colours) |
| Support launcher (88 checks: 100/125/150/200% zoom, 1024/768 tablet, 390/320 mobile; mouse, touch tap, keyboard; scrolled list, open dropdown, open dialog) | 88 pass / 0 fail |
| Dashboard interaction suite at 9 sizes (filters, search, pagination, row actions, drawer, dialog, sidebar, menu, 30-stop keyboard walk, request loop, console) | 0 failures |
| Table/card switching (9 widths, rail shown/hidden) | correct and exclusive; no page h-scroll |
| 32-route smoke × 4 settings (1280, 200% zoom, 390, 200% font) = 128 | 128 clean (no overflow, spilled text, covered control, crash) |

## Not covered
Firefox (not installed) and Safari (installed, but automation needs the user to enable Develop → Allow Remote Automation). Only Chrome was exercised.

## Final release gate (dark-theme text tokens and large-text fixes)

- New `--primary-text` token (light `262 72% 50%`, dark `262 80% 74%`, 5.2:1 or better on the dark page, card and tinted surfaces); all `text-primary` usages now use `text-primary-text`. Fill colour `--primary` is unchanged.
- Profile role/status badges moved from hard-coded yellow/green-600 to the warning/success text tokens.
- axe-core (wcag2a/aa/21/22aa), 500-task fixture, 1280 and 390 wide: light theme 0 violations on Dashboard, Projects, Board, Calendar, Notifications, Profile. Dark theme: Dashboard 0, Profile 0, Projects 0, Notifications 0; Board and Calendar still have 44 contrast failures from hard-coded light surfaces (outside this change).
- Large-text fixes found at a 32px browser default font on 320/390px screens: header action cluster wraps instead of colliding, stat cards, rail buttons and task-card grid wrap instead of spilling.
- Dashboard interaction suite: 158 checks, 0 failures at 1920@100/125/150/200%, 1366, 1024, 768, 390 and 320. 32-route smoke: 128 of 128 clean.
- Not done: live-backend smoke (no authorized test account; local env points at production), Safari (Remote Automation disabled), Firefox (not installed).
