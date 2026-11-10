import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, GROUPS, normalizePreferences, deriveRows, filterRows, settle, snooze, wake, shelfRows, nextSession, reorder, recordReturns } from '../src/model.mjs';

const now = Date.UTC(2026, 10, 9, 14);
const make = (overrides = {}) => ({ id: 'a', title: 'Example', updatedAt: now - 1000, running: false, blank: false, retainedBy: {}, ...overrides });
const listOf = (...rows) => ({ ids: rows.map(row => row.id), byId: Object.fromEntries(rows.map(row => [row.id, row])), projectionsBySession: {} });
const ws = { items: [], pinnedSessionIds: [], archivedSessionIds: [] };
const derive = (list, statuses = new Map(), prefs = DEFAULTS, workspace = ws, time = now) => deriveRows(list, workspace, statuses, prefs, time);
const ids = rows => rows.map(row => row.id);

test('placement is independent of badges: pinned pending work stays pinned, Done stays Active', () => {
  const list = listOf(make({ id: 'p', running: true }), make({ id: 'done' }), make({ id: 'question', running: true }));
  const statuses = new Map([
    ['p', { running: true, pendingInteraction: { kind: 'approval' } }],
    ['done', { completionUnread: true }],
    ['question', { running: true, pendingInteraction: { kind: 'question' } }],
  ]);
  const rows = derive(list, statuses, DEFAULTS, { ...ws, pinnedSessionIds: ['p'] });
  assert.deepEqual(GROUPS, ['pinned', 'active', 'working', 'snoozed', 'settled', 'archived']);
  assert.equal(rows.find(row => row.id === 'p').group, 'pinned');
  assert.equal(rows.find(row => row.id === 'p').state, 'approval');
  assert.equal(rows.find(row => row.id === 'done').group, 'active');
  assert.equal(rows.find(row => row.id === 'done').state, 'unread');
  assert.equal(rows.find(row => row.id === 'question').group, 'active');
});

test('Working is an optional shelf and running children do not become root rows', () => {
  const list = listOf(make(), make({ id: 'child', origin: 'subagent', running: true }));
  list.projectionsBySession.a = { values: { subagentCatalog: [{ id: 'child' }] } };
  assert.deepEqual(ids(derive(list)), ['a']);
  assert.equal(derive(list)[0].group, 'working');
  assert.equal(derive(list)[0].childCount, 1);
  assert.equal(derive(list, new Map(), { ...DEFAULTS, workingSection: false })[0].group, 'active');
});

test('manual settlement can park pinned or running work without changing native membership or execution', () => {
  const list = listOf(make({ running: true }));
  const workspace = { ...ws, pinnedSessionIds: ['a'] };
  const before = derive(list, new Map(), DEFAULTS, workspace)[0];
  const prefs = settle(DEFAULTS, before, now);
  const parked = derive(list, new Map(), prefs, workspace)[0];
  assert.equal(parked.group, 'settled');
  assert.equal(parked.running, true);
  assert.equal(parked.pinned, true);
  assert.deepEqual(workspace.pinnedSessionIds, ['a']);
  assert.equal(parked.settledAt, now);
  assert.equal(settle(DEFAULTS, { ...before, waiting: true }, now), DEFAULTS);
});

test('a snoozed run and its ordinary completion remain snoozed until the chosen time', () => {
  const list = listOf(make({ running: true }));
  const prefs = snooze(DEFAULTS, derive(list)[0], now + 3600000, now);
  assert.equal(derive(list, new Map(), prefs)[0].group, 'snoozed');
  const completed = listOf(make());
  const row = derive(completed, new Map([['a', { running: false, completionUnread: true }]]), prefs)[0];
  assert.equal(row.group, 'snoozed');
  assert.equal(row.unread, true);
  assert.equal(row.snoozedUntil, now + 3600000);
});

test('a pending request becomes visible and an explicit wake prevents re-parking after it resolves', () => {
  const list = listOf(make());
  const prefs = snooze(DEFAULTS, derive(list)[0], now + 3600000, now);
  const row = derive(list, new Map([['a', { pendingInteraction: { kind: 'plan-review' } }]]), prefs)[0];
  assert.equal(row.group, 'active');
  assert.equal(row.state, 'plan-review');
  assert.equal(row.pendingWake, true);
  const reconciled = wake(prefs, row);
  assert.equal(derive(list, new Map(), reconciled)[0].group, 'active');
  assert.equal(snooze(DEFAULTS, row, now + 1000, now), DEFAULTS);
});

test('timer wake survives auto-settlement and reload; only newer user activity invalidates its watermark', () => {
  const list = listOf(make({ updatedAt: now - 48 * 3600000 }));
  const prefs = snooze(DEFAULTS, derive(list)[0], now + 3600000, now);
  const reloaded = normalizePreferences(prefs);
  assert.equal(derive(list, new Map(), reloaded, ws, now + 3600001)[0].group, 'active');
  assert.equal(derive(listOf(make({ updatedAt: now + 3600001 })), new Map(), reloaded, ws, now + 3600002)[0].group, 'active');
  assert.equal(snooze(DEFAULTS, derive(list)[0], now, now), DEFAULTS);
});

test('timer wake promotes by its deadline above older work but below activity after that deadline', () => {
  const until = now + 3600000;
  const list = listOf(make({ id: 'beforeWake', updatedAt: until - 1000 }), make({ id: 'sleeping', updatedAt: now - 48 * 3600000 }), make({ id: 'afterWake', updatedAt: until + 1000 }));
  const prefs = { ...DEFAULTS, snoozed: { sleeping: { stamp: now, until } } };
  for (const observedAt of [until + 2000, until + 12 * 3600000]) {
    const rows = derive(list, new Map(), prefs, ws, observedAt);
    assert.deepEqual(ids(rows.filter(row => row.group === 'active')), ['afterWake', 'sleeping', 'beforeWake']);
    assert.equal(rows.find(row => row.id === 'sleeping').timerWakeAt, until);
  }
  assert.deepEqual(prefs.returnedAt, {});
});

test('new user prompts wake a settled or snoozed conversation, while visiting does not', () => {
  const original = listOf(make());
  const row = derive(original)[0];
  const parked = [settle(DEFAULTS, row, now), snooze(DEFAULTS, row, now + 3600000, now)];
  for (const prefs of parked) {
    const current = listOf(make({ retainedBy: { mainView: 1 } }));
    assert.ok(['settled', 'snoozed'].includes(derive(current, new Map(), prefs)[0].group));
    assert.equal(derive(listOf(make({ updatedAt: now })), new Map(), prefs)[0].group, 'active');
  }
});

test('collapsed shelves render only the routed parked row, without expanding or waking siblings', () => {
  const rows = [{ id: 'a', group: 'settled' }, { id: 'b', group: 'settled' }, { id: 'c', group: 'active' }];
  assert.deepEqual(ids(shelfRows(rows, 'settled', 'b', false)), ['b']);
  assert.deepEqual(shelfRows(rows, 'settled', 'c', false), []);
  assert.deepEqual(ids(shelfRows(rows, 'settled', 'b', true)), ['a', 'b']);
  assert.equal(rows[1].group, 'settled');
});

test('park-current navigation skips shelves and batch targets, wraps, and has a no-target result', () => {
  const rows = [{ id: 'p', group: 'pinned' }, { id: 'a', group: 'active' }, { id: 'b', group: 'active' }, { id: 'w', group: 'working' }, { id: 's', group: 'snoozed' }, { id: 'z', group: 'settled' }];
  assert.equal(nextSession(rows, 'a'), 'b');
  assert.equal(nextSession(rows, 'b'), 'p');
  assert.equal(nextSession(rows, 'a', ['b', 'p']), null);
  assert.equal(nextSession(rows, 'missing'), null);
});

test('each section uses its own order rather than a shared last-prompt sort', () => {
  const list = listOf(make({ id: 'pOld', updatedAt: now - 3000 }), make({ id: 'pNew' }), make({ id: 'sLater' }), make({ id: 'sSoon' }), make({ id: 'zRecent', updatedAt: now - 5000 }), make({ id: 'zOlder' }));
  const prefs = { ...DEFAULTS, snoozed: { sLater: { stamp: now, until: now + 2000 }, sSoon: { stamp: now, until: now + 1000 } }, settled: { zRecent: now, zOlder: now }, settledAt: { zRecent: now, zOlder: now - 1000 } };
  const rows = derive(list, new Map(), prefs, { ...ws, pinnedSessionIds: ['pOld', 'pNew'] });
  assert.deepEqual(ids(rows), ['pOld', 'pNew', 'sSoon', 'sLater', 'zRecent', 'zOlder']);
});

test('auto-settlement protects current, pinned, unread and executing work', () => {
  const old = now - 48 * 3600000;
  const list = listOf(make({ id: 'idle', updatedAt: old }), make({ id: 'current', updatedAt: old, retainedBy: { mainView: 1 } }), make({ id: 'pin', updatedAt: old }), make({ id: 'done', updatedAt: old }), make({ id: 'run', updatedAt: old, running: true }));
  const rows = derive(list, new Map([['done', { completionUnread: true }]]), DEFAULTS, { ...ws, pinnedSessionIds: ['pin'] });
  assert.equal(rows.find(row => row.id === 'idle').group, 'settled');
  assert.equal(rows.find(row => row.id === 'current').group, 'active');
  assert.equal(rows.find(row => row.id === 'pin').group, 'pinned');
  assert.equal(rows.find(row => row.id === 'done').group, 'active');
  assert.equal(rows.find(row => row.id === 'run').group, 'working');
});

test('blank and archived boundaries survive filtering, and attention filters badges across placements', () => {
  const list = listOf(make({ id: 'hidden', blank: true }), make({ blank: true, retainedBy: { mainView: 1 } }), make({ id: 'p' }), make({ id: 'archived', running: true }));
  const rows = derive(list, new Map([['p', { pendingInteraction: { kind: 'approval' } }]]), DEFAULTS, { ...ws, pinnedSessionIds: ['p'], archivedSessionIds: ['archived'] });
  assert.equal(rows.some(row => row.id === 'hidden'), false);
  assert.deepEqual(ids(filterRows(rows, { filter: 'attention' })), ['p']);
  assert.deepEqual(ids(filterRows(rows, { filter: 'archived' })), ['archived']);
  assert.equal(filterRows(rows).some(row => row.id === 'archived'), false);
});

test('metadata and repeated content hits find a conversation once, in its existing stable order', () => {
  const list = listOf(make(), make({ id: 'b', title: 'Another' }));
  const rows = derive(list, new Map(), DEFAULTS, { ...ws, items: [{ workspaceId: 'project', title: 'DSH', sessionIds: ['a'] }] });
  assert.deepEqual(ids(filterRows(rows, { query: 'dsh', workspace: 'project' })), ['a']);
  assert.deepEqual(ids(filterRows(rows, { query: 'not-in-title', contentIds: ['b', 'b'] })), ['b']);
  assert.equal(Object.hasOwn(rows[0], 'createdAt'), false);
});

test('drag reorders Active only, preserves parked positions, and Settle clears its arranged position', () => {
  const rows = [{ id: 'a', group: 'active' }, { id: 'parked', group: 'snoozed' }, { id: 'b', group: 'active' }, { id: 'c', group: 'active' }];
  const prefs = { ...DEFAULTS, workingSection: false, activeOrder: ['a', 'parked', 'b', 'c'] };
  const moved = reorder(prefs, rows, 'c', 'a');
  assert.deepEqual(moved.activeOrder, ['c', 'parked', 'a', 'b']);
  assert.deepEqual(reorder(moved, rows, 'c').activeOrder, ['a', 'parked', 'b', 'c']);
  assert.equal(reorder(prefs, rows, 'parked', 'a'), prefs);
  assert.equal(reorder(prefs, rows, 'a', 'missing'), prefs);
  const list = listOf(make({ id: 'a' }), make({ id: 'b', updatedAt: now }));
  assert.deepEqual(ids(derive(list, new Map(), { ...moved, activeOrder: ['a', 'b'] })), ['a', 'b']);
  assert.deepEqual(settle(prefs, make(), now).activeOrder, ['parked', 'b', 'c']);
  const withNew = listOf(make({ id: 'a' }), make({ id: 'new' }), make({ id: 'b' }));
  assert.deepEqual(ids(derive(withNew, new Map(), { ...prefs, activeOrder: ['b', 'a'] })), ['new', 'b', 'a']);
  const enabled = { ...prefs, workingSection: true };
  assert.equal(reorder(enabled, rows, 'c', 'a'), enabled);
  assert.deepEqual(ids(derive(list, new Map(), { ...enabled, activeOrder: ['a', 'b'] })), ['b', 'a']);
});

test('observed root and child returns lead Active and restart local inactivity without moving pins', () => {
  const old = now - 48 * 3600000;
  const list = listOf(make({ id: 'fresh' }), make({ id: 'root', updatedAt: old, running: true }), make({ id: 'parent', updatedAt: old }), make({ id: 'child', origin: 'subagent', running: true }), make({ id: 'p1', updatedAt: old, running: true }), make({ id: 'p2', updatedAt: old }));
  list.projectionsBySession.parent = { values: { subagentCatalog: [{ id: 'child' }] } };
  const workspace = { ...ws, pinnedSessionIds: ['p2', 'p1'] };
  const previous = derive(list, new Map(), DEFAULTS, workspace);
  const finished = listOf(...list.ids.map(id => ({ ...list.byId[id], running: false })));
  finished.projectionsBySession = list.projectionsBySession;
  const observed = derive(finished, new Map(), DEFAULTS, workspace);
  assert.equal(observed.find(row => row.id === 'parent').group, 'settled');
  const prefs = recordReturns(DEFAULTS, previous, observed, now);
  assert.deepEqual(prefs.returnedAt, { p1: now, root: now, parent: now });
  assert.equal(prefs.snoozed, DEFAULTS.snoozed);
  const rows = derive(finished, new Map(), normalizePreferences(prefs), workspace, now + 1);
  assert.deepEqual(ids(rows.filter(row => row.group === 'pinned')), ['p2', 'p1']);
  assert.deepEqual(ids(rows.filter(row => row.group === 'active')), ['root', 'parent', 'fresh']);
  assert.equal(recordReturns(prefs, observed, observed, now + 1), prefs);
});

test('return tracking invents no baseline or snoozed completion, but observes a new request once', () => {
  const running = listOf(make({ running: true }));
  const prefs = snooze(DEFAULTS, derive(running)[0], now + 3600000, now);
  const previous = derive(running, new Map(), prefs);
  const completed = derive(listOf(make()), new Map(), prefs);
  assert.equal(recordReturns(prefs, null, completed, now), prefs);
  assert.equal(recordReturns(prefs, [], completed, now), prefs);
  assert.equal(recordReturns(prefs, previous, completed, now), prefs);
  assert.deepEqual(prefs.returnedAt, {});
  const idle = derive(listOf(make()));
  const waiting = derive(listOf(make()), new Map([['a', { pendingInteraction: { kind: 'question' } }]]));
  const raised = recordReturns(DEFAULTS, idle, waiting, now);
  assert.deepEqual(raised.returnedAt, { a: now });
  assert.equal(recordReturns(raised, waiting, waiting, now + 1), raised);
  const newCatalogMember = derive(listOf(make(), make({ id: 'new' })));
  assert.equal(recordReturns(DEFAULTS, idle, newCatalogMember, now), DEFAULTS);
});

test('corrupt preferences discard invalid data and normalize new view preferences', () => {
  const prefs = normalizePreferences({ mode: 'bad', workingSection: false, returnedAt: { a: Infinity, b: 10 }, activeOrder: ['a', null, 'a', '', 10, 'b'], settled: { a: 'bad', b: 10 }, settledAt: { b: 20 }, autoSettleHours: -1, snoozed: { a: null }, collapsed: { attention: true, working: true, settled: true } });
  assert.equal(prefs.mode, 'modern');
  assert.equal(prefs.workingSection, false);
  assert.deepEqual(prefs.returnedAt, { b: 10 });
  assert.deepEqual(prefs.activeOrder, ['a', 'b']);
  assert.deepEqual(prefs.settled, { b: 10 });
  assert.deepEqual(prefs.settledAt, { b: 20 });
  assert.deepEqual(prefs.snoozed, {});
  assert.deepEqual(prefs.collapsed, { working: true, settled: true });
});
