# T3-style session inbox 2.0.0 — isolated verification

The revised plugin uses English for its own interface and replaces the former status-dashboard layout with T3's compact toolbar, project-first rows, Pinned/Active list, and bottom shelves. Native DSH navigation remains around the replaced session browser.

Reference: the official product screenshot and Sidebar/SidebarThreadRow/SidebarThreadHeader source at [T3 commit 6647b0a](https://github.com/pingdotgg/t3code/tree/6647b0a761ff7a1287047a9bb5fd5b63772f456b), dated 2026-11-09. T3's own application was not run locally; its official screenshot was visually reviewed and its current interaction paths were traced in source.

## Actual installation and results

- Runtime: the installed Desktop's DSH 0.2.2-rc.1 CLI, running Web at `http://127.0.0.1:12641` with an independent DSH_HOME and Web profile. The daily Desktop profile was not used for this revision's installation.
- Four genuine isolated sessions: the earlier completed test conversation plus three native conversation forks. No mocked UI or fabricated runtime states were used for the screenshots.
- Browser-verified: English plugin controls; inline rename with Enter; native pin; one-hour Snooze; Settle; advancing to another active conversation; explicit Unsettle; opening parked work without waking it; current-row visibility in a collapsed shelf; keyboard search Enter/Escape; native sidebar round-trip; Working option; drag reordering; persistence across a cold server start and a browser refresh.
- The first drag attempt exposed a real layout problem: entering drag mode inserted headings above the destination. Zero-height markers fixed the offset; the next actual drag changed Active order from `(2), (1)` to `(1), (2)`.
- 18/18 model tests passed. They additionally exercise running/child/pending state boundaries, ordinary completion during Snooze, deadline-based wake promotion, observed completion returning to the top, no fabricated initial return times, inactivity guards, and corrupt preferences.
- Client syntax checked after the final date-formatting change. Final capture: 90 requests, 14 operations, 0 captured page errors, no dropped events; collection began before visiting the page. This count does not assert that browser-tool screenshot operations succeeded.

## Visual evidence and delivery

- [Full actual page, light theme](modern-sidebar-2.0.0-light.png).
- [Session region, cropped from that same screenshot](modern-sidebar-2.0.0-session-region.png). No layout, labels or state were composited into the image.
- [Installable plugin archive](local-dsh-session-triage-2.0.0.tgz). Its nine allowed files were checked against the verified source: runtime files match byte for byte, and the package manifest is semantically identical after pnpm's formatting normalization. No test home, credentials, history, reference downloads or debug captures are packaged.
- Archive SHA-256: `612EDF970052C6FC38A04A0268F4E8FF8840829085A7472BD7CB1F135F202D5B`.

Detailed local evidence remains under `.sandbox/web-lab-20261109/evidence/triage-v2-english/`, including both browser captures, final runtime identity, model test output, cold-start log, post-drag observation and final UI observation. These private lab files are not part of the release archive.

## Verification boundaries

The lab's content-search index is disabled (`openAt: never`), so the real API returned an explicit disabled-index error. The plugin kept title/workspace search and keyboard opening usable and displayed the limitation. No deployment search settings were changed.

The short-lived Undo control was observed, but the automated follow-up arrived after it expired; executing Undo was not verified. Live busy/pending lifecycle transitions were verified by the model tests rather than by producing new agent work or approvals in this final UI pass.

A final screenshot after resizing repeatedly timed out even though DOM interaction continued. The saved light screenshot above was captured successfully before resizing and includes the final compact deadline text. A final dark screenshot was not obtained. The lab appearance was restored through Settings to System, and its language remains English.

Initial Active ordering uses DSH's last-prompt/catalog facts because the cold catalog exposes no creation timestamp. Local return observations and real Snooze deadlines improve later ordering; they do not reconstruct past offline completion times. Missing Git/provider metadata is omitted. There is no claim of full T3 server-policy equivalence or Electron Desktop end-to-end coverage.

The isolated preview server remains running for review. Owned browser test windows and debug captures have been closed/stopped.
