# Session inbox for DSH

An English-first session sidebar inspired by the current T3 Code sidebar. Version 2 replaces the earlier status-dashboard layout.

## Layout and interactions

- One compact Search toolbar with workspace scope, add-workspace, and options actions. The native New session button above the sidebar owns session creation; the plugin does not duplicate it.
- Pinned sessions above the Active list, without permanent section headings or boxed cards.
- Project and status on the first line; session title below. Actual subagent information appears when available. Unavailable Git branches and provider identities are omitted.
- Hover or keyboard focus replaces a row's status with Snooze, Settle, and the native session menu, without adding another row of controls.
- Project icons are generated: initials plus a stable tone derived from the project's path, or from the directory most of its sessions live in when the workspace has no path. Options → Project icons customizes any project with a preset icon, a custom character or emoji, or no icon; the automatic mark can be restored at any time.
- Working, Snoozed, and Settled shelves sit at the bottom of the same scrolling list. Shelves start collapsed. Working uses full rows; Snoozed and Settled use compact rows.
- A collapsed shelf still shows its currently open session. Opening it does not wake or un-settle it.
- Settling or snoozing the current session advances to another Pinned/Active session in the current filter, or opens a new session when none remains.
- Double-click a title to rename it. Enter saves; Escape cancels. Search supports arrow keys, Enter to open, and Escape to clear.
- Disable the Working shelf in Sidebar options to manually drag-reorder Active sessions. Dragging between supported placements uses the same actions as their controls.
- Use the existing footer icon or Settings → General → Session sidebar to switch back to the native workspace browser.

UI strings in this revision use English regardless of the application's language. This is scoped to the plugin; it does not change the application's language preference. Display metadata is supplied in English and Chinese.

## Placement and state

Runtime state is a badge rather than a separate Attention group. Pinned work stays pinned while running or waiting for input. Unpinned background execution goes to Working when that shelf is enabled; new input, approval requests and observed work completion return to Active.

Snooze does not stop an agent. Ordinary running, subagent execution and completion do not wake a snoozed session. Its deadline, a new user prompt, explicit Wake, or a new pending interaction can wake it. DSH pending interactions are deliberately kept visible.

Settle only changes local browsing preferences; it does not archive a session, dismiss an approval, stop a terminal, or clean a worktree. The UI unpins a pinned session through DSH before settling or snoozing it. Actions offer a short-lived Undo notice.

Preferences use the plugin's own localStorage key and synchronize between windows at the same GUI origin. They are not server-wide session metadata. Existing v1 preferences are normalized on load.

## Current adaptation limits

- DSH's cold session catalog supplies last-user-prompt recency rather than creation timestamps. Initial Active ordering uses those real facts; it is not claimed to be T3's exact creation order.
- While the Working shelf is enabled, observed completions and input requests move above older activity. These local observations are not reconstructed for work that completed while this UI was disconnected.
- Git/PR/provider badges require real indexed metadata. This revision does not invent them or open each session's history to obtain them.
- Snoozing an already pending approval/question is disabled rather than deferring that authority request.
- Auto-settle defaults to a local 24-hour inactivity rule and protects current, pinned, unread and executing sessions. It does not reproduce T3's server-side cleanup policies.
- Message-content search depends on DSH's optional search index. If disabled, title/workspace search and keyboard opening continue to work and the UI reports the limitation.

## Development and isolated testing

No npm dependencies or install scripts. Use Node 22+:

```powershell
node build.mjs
node --check client.js
node --test test/*.test.mjs
```

Source files are in `src/`. The build emits a Client module using only the host's React runtime. Registration replaces `sidebar.workspaces` with priority `-50` and reuses native services; it does not redeclare the native workspace plugin's child slots.

Use the [isolated testing skill](skills/dsh-isolated-plugin-testing/SKILL.md) with the Desktop runtime, an independent DSH_HOME, and a Web profile. The current conversation's plugin manager does not target another process. Keep experimental code out of the daily Desktop profile until the user chooses to adopt it.

The actual Web instance and evidence are documented separately. Web verification is not Electron Desktop end-to-end verification.

## Reference and license

Visual baseline: [the official T3 Code product screenshot](https://github.com/pingdotgg/t3code/blob/6647b0a761ff7a1287047a9bb5fd5b63772f456b/apps/marketing/src/assets/app-desktop.webp).

Layout and interaction reference: [Sidebar](https://github.com/pingdotgg/t3code/blob/6647b0a761ff7a1287047a9bb5fd5b63772f456b/apps/web/src/components/Sidebar.tsx), [SidebarThreadRow](https://github.com/pingdotgg/t3code/blob/6647b0a761ff7a1287047a9bb5fd5b63772f456b/apps/web/src/components/sidebar/SidebarThreadRow.tsx), and [thread sidebar guide](https://github.com/pingdotgg/t3code/blob/6647b0a761ff7a1287047a9bb5fd5b63772f456b/docs/user/thread-sidebar.md), pinned to commit `6647b0a761ff7a1287047a9bb5fd5b63772f456b` (2026-11-09).

The plugin and its original icons are independently implemented under MIT. The new-session glyph follows DSH's native `IconNewChatOutlineMedium` geometry and its 16-unit grid. No T3 Code source is bundled in the plugin distribution. Public reference files remain outside the package's distribution file list.
