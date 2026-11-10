# Rounded icon refinement

Updated 2026-11-11 (Asia/Hong_Kong).

New-session icon: replaced the custom compose glyph with the exact geometry of DSH's native top-left `IconNewChatOutlineMedium`. The native 16-unit viewBox, 1.3 stroke width, and plus centered at (8, 8) are preserved. Read the rendered native SVG symbol and compared it against the plugin's rendered SVG after restarting the isolated Web instance: all three path strings, viewBox, and stroke weight matched exactly. Refreshed the Client build and both comparison files; syntax and diff checks passed.

## Changes

- Redrew all 17 sidebar glyphs with rounded silhouettes and consistent optical spacing.
- Standardized original glyphs at 1.8 on a 24-unit grid; the native new-session glyph retains its 1.3 stroke and 16-unit grid. Toolbar action icons use 16 px.
- Replaced near-zero-length ellipsis strokes with filled circles for reliable small-size rendering.
- Added a stable, non-shrinking SVG class and increased icon-button hover corner radius to 8 px.
- Replaced the package mark with a rounded green inbox, conversation cards, and a completion check.
- Rebuilt the distributed client module. No interaction or session model changes.

## Validation

- Build and JavaScript syntax check passed.
- Existing 18 model tests passed.
- `git diff --check` passed.
- Standalone light/dark comparison visually inspected at 12, 16, and 28 px. Browser geometry checks found no glyph paths outside their viewBox and no horizontal page overflow.
- Fresh isolated Web baseline loaded its native sidebar before plugin installation.
- Installation used the Desktop runtime's public CLI and only the isolated home/profile below.
- Updated plugin Client activated successfully; the actual dark-theme toolbar rendered the new paths and 1.8 stroke weight.
- Modern/classic switching restored the native sidebar, and switching back and refreshing preserved modern mode.
- No console errors captured for the updated instance. Earlier connection errors belonged to the deliberately stopped baseline instance at port 2283.
- Electron Desktop shell validation was not performed. Daily profile configuration was not modified.

## Isolated test record

- Runtime version: `0.2.2-rc.1`.
- CLI: `C:\Users\Blanit\AppData\Local\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd`.
- Lab root: `.sandbox/icon-rounding-20261110-1/`.
- DSH_HOME: `.sandbox/icon-rounding-20261110-1/home/`.
- Profile: `web`; workspace: `.sandbox/icon-rounding-20261110-1/workspace/`.
- Baseline address: `http://127.0.0.1:2283/`; listener PID 42328, started 22:54:53.
- Updated instance: `http://127.0.0.1:10557/`; listener PID 7116, started 23:01:49.
- Native-icon follow-up: `http://127.0.0.1:9050/` (PID 65192, started 2026-11-11 00:16:01) was used to inspect the native symbol. After rebuilding, `http://127.0.0.1:7385/` (PID 61396, started 00:20:31) verified exact SVG equality and successful Client activation. Both follow-up instances and the temporary comparison server at port 4809 were stopped after verification.
- Logs and run metadata remain inside the lab root. Authorized startup URLs are omitted from this report.
- Both owned test listeners and the temporary comparison server were stopped; ports 2283, 10557, and 3730 were released. Daily service at port 5926 remained listening with PID 22172.

## Evidence

- [Before/after image](icons-rounded.png).
- [Self-contained comparison page](icons-rounded.html): both themes, all glyphs, actual-size toolbar, and package mark.
- The actual running sidebar screenshot is retained locally at `.diagnostics/icons-runtime-dark.png`.
