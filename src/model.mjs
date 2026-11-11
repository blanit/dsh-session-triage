export const DEFAULTS = { mode: 'modern', workingSection: true, sort: 'newest', activeOrder: [], autoSettleHours: 24, returnedAt: {}, done: {}, settled: {}, settledAt: {}, snoozed: {}, awakened: {}, collapsed: {}, projectIcons: {} };
export const GROUPS = ['pinned', 'active', 'working', 'snoozed', 'settled', 'archived'];
export const PROJECT_ICONS = ['folder', 'code', 'terminal', 'package', 'book', 'spark', 'branch', 'layers'];
export const PROJECT_TONES = 6;

export function normalizePreferences(input) {
  const value = input && typeof input === 'object' ? input : {};
  const numbers = record => Object.fromEntries(Object.entries(record && typeof record === 'object' ? record : {}).filter(([key, number]) => key.length > 0 && Number.isFinite(number) && number >= 0));
  const snoozed = Object.fromEntries(Object.entries(value.snoozed && typeof value.snoozed === 'object' ? value.snoozed : {}).filter(([, mark]) => mark && Number.isFinite(mark.until) && Number.isFinite(mark.stamp)));
  return {
    mode: value.mode === 'classic' ? 'classic' : 'modern',
    workingSection: value.workingSection !== false,
    sort: value.sort === 'oldest' ? 'oldest' : 'newest',
    activeOrder: [...new Set((Array.isArray(value.activeOrder) ? value.activeOrder : []).filter(id => typeof id === 'string' && id.length > 0))],
    autoSettleHours: [0, 6, 24, 72, 168].includes(value.autoSettleHours) ? value.autoSettleHours : 24,
    returnedAt: numbers(value.returnedAt), done: numbers(value.done), settled: numbers(value.settled), settledAt: numbers(value.settledAt), snoozed, awakened: numbers(value.awakened),
    collapsed: Object.fromEntries(Object.entries(value.collapsed ?? {}).filter(([key, flag]) => GROUPS.includes(key) && typeof flag === 'boolean')),
    projectIcons: normalizeProjectIcons(value.projectIcons),
  };
}

// Per-project icon overrides stay presentation-only: an absent entry means the generated icon.
function normalizeProjectIcons(input) {
  const entries = Object.entries(input && typeof input === 'object' ? input : {}).slice(0, 200).flatMap(([key, entry]) => {
    if (!key || !entry || typeof entry !== 'object') return [];
    if (entry.kind === 'none') return [[key, { kind: 'none' }]];
    if (entry.kind === 'icon' && PROJECT_ICONS.includes(entry.value)) return [[key, { kind: 'icon', value: entry.value }]];
    const text = typeof entry.value === 'string' ? Array.from(entry.value.trim()).slice(0, 4).join('') : '';
    return entry.kind === 'text' && text ? [[key, { kind: 'text', value: text }]] : [];
  });
  return Object.fromEntries(entries);
}

const pathBase = value => String(value ?? '').replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean).at(-1) ?? '';

export function projectKeyFor(row) {
  const id = row?.workspace?.workspaceId;
  if (id) return `workspace:${id}`;
  return row?.cwd ? `cwd:${row.cwd}` : '';
}

// The generated icon follows the project's own path, never its transient session order.
// Workspace snapshots may omit `path`; the owning session cwd is the next best project fact.
export function projectSeedFor(row) {
  return row?.workspace?.path || row?.projectSeed || row?.cwd || row?.workspace?.title || '';
}

export function projectInitials(seed) {
  const base = pathBase(seed);
  const words = base.split(/[\s._-]+/).filter(Boolean);
  const sources = words.length > 1 ? [words[0], words.at(-1)] : [base];
  const letters = [];
  for (const word of sources) {
    const first = Array.from(word).find(character => /[\p{L}\p{N}]/u.test(character));
    if (first) letters.push(first);
    if (letters.length === 2) break;
  }
  return letters.join('').toUpperCase() || '·';
}

export function projectTone(seed) {
  let hash = 2166136261;
  for (const character of String(seed ?? '')) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % PROJECT_TONES;
}

export function projectIcon(preferences, row, seed) {
  const key = projectKeyFor(row);
  const source = seed ?? projectSeedFor(row);
  const entry = key ? preferences?.projectIcons?.[key] : undefined;
  if (entry?.kind === 'none') return { kind: 'none' };
  if (entry?.kind === 'icon' && PROJECT_ICONS.includes(entry.value)) return { kind: 'icon', value: entry.value, tone: projectTone(source) };
  if (entry?.kind === 'text' && entry.value) return { kind: 'text', value: entry.value, tone: projectTone(source) };
  return { kind: 'auto', value: projectInitials(source), tone: projectTone(source) };
}

// A Workspace without its own path borrows the directory most of its sessions live in.
export function dominantProjectSeed(rows) {
  const tally = new Map();
  for (const row of rows) {
    const seed = row?.cwd || row?.workspace?.path;
    if (!seed) continue;
    const entry = tally.get(seed) ?? { count: 0, latest: 0 };
    entry.count += 1;
    entry.latest = Math.max(entry.latest, row.activityStamp ?? row.updatedAt ?? 0);
    tally.set(seed, entry);
  }
  let best = '';
  let chosen = { count: 0, latest: -1 };
  for (const [seed, entry] of tally) if (entry.count > chosen.count || entry.count === chosen.count && entry.latest > chosen.latest) { best = seed; chosen = entry; }
  return best;
}

export function mainSessionId(list) {
  return list.ids.find(id => (list.byId[id]?.retainedBy?.mainView ?? 0) > 0);
}

function compareCatalog(a, b, oldest = false) {
  // Cold DSH catalog rows expose no creation timestamp; retain the observed order.
  return (oldest ? b.order - a.order : a.order - b.order) || a.id.localeCompare(b.id);
}

export function deriveRows(list, workspaceSnapshot, statuses, preferences, now) {
  const current = mainSessionId(list);
  const pinnedOrder = new Map((workspaceSnapshot.pinnedSessionIds ?? []).map((id, index) => [id, index]));
  const activeOrder = new Map((preferences.activeOrder ?? []).map((id, index) => [id, index]));
  const archived = new Set(workspaceSnapshot.archivedSessionIds ?? []);
  const workspaceBySession = new Map();
  for (const workspace of workspaceSnapshot.items ?? []) for (const id of workspace.sessionIds) if (!workspaceBySession.has(id)) workspaceBySession.set(id, workspace);
  return list.ids.flatMap((id, order) => {
    const summary = list.byId[id];
    if (!summary || summary.origin === 'subagent' || (summary.blank && id !== current)) return [];
    const status = statuses.get(id);
    const pending = status?.pendingInteraction?.kind;
    const values = list.projectionsBySession?.[id]?.values ?? summary.projectionValues ?? {};
    const children = values.subagentCatalog ?? [];
    const childCount = children.reduce((n, child) => n + ((statuses.get(child.id)?.running ?? list.byId[child.id]?.running) === true ? 1 : 0), 0);
    const running = (status?.running ?? summary.running) === true;
    const waiting = ['approval', 'question', 'plan-review'].includes(pending);
    // Host status wins; a locally observed completion covers hosts that report it late or not at all.
    const localDone = preferences.done?.[id] !== undefined && preferences.done[id] >= (summary.updatedAt ?? 0);
    const unread = status?.completionUnread === true || (!running && !waiting && localDone);
    // DSH catalog recency is the latest user prompt/steer, not run completion.
    const updatedAt = Number.isFinite(summary.updatedAt) ? summary.updatedAt : 0;
    const activityStamp = updatedAt;
    const isArchived = archived.has(id);
    const isPinned = pinnedOrder.has(id) && !isArchived;
    const mark = preferences.snoozed[id];
    const validSnooze = !summary.blank && Number.isFinite(mark?.until) && mark.stamp >= activityStamp;
    const snoozed = validSnooze && mark.until > now;
    const timerWoke = validSnooze && mark.until <= now;
    const timerWakeAt = timerWoke ? mark.until : undefined;
    const manuallySettled = preferences.settled[id] !== undefined && preferences.settled[id] >= activityStamp;
    const explicitlyAwake = preferences.awakened?.[id] !== undefined && preferences.awakened[id] >= activityStamp;
    const inactivityAnchor = Math.max(activityStamp, preferences.returnedAt?.[id] ?? 0);
    const inactivityElapsed = preferences.autoSettleHours > 0 && now - inactivityAnchor >= preferences.autoSettleHours * 3600000;
    const autoSettled = inactivityElapsed && id !== current && !explicitlyAwake && !timerWoke && !isPinned && !running && childCount === 0 && !waiting && !unread && !summary.blank;
    const pendingWake = waiting && (snoozed || manuallySettled);
    const group = isArchived ? 'archived'
      : pendingWake ? 'active'
      : snoozed ? 'snoozed'
      : manuallySettled && !summary.blank ? 'settled'
      : isPinned ? 'pinned'
      : waiting ? 'active'
      : autoSettled ? 'settled'
      : preferences.workingSection !== false && (running || childCount > 0) ? 'working'
      : 'active';
    const state = isArchived ? 'archived' : waiting ? pending : running ? 'running' : childCount > 0 ? 'children' : unread ? 'unread' : summary.blank ? 'draft' : 'idle';
    const settledAt = group === 'settled' ? (manuallySettled ? preferences.settledAt?.[id] ?? activityStamp : inactivityAnchor + preferences.autoSettleHours * 3600000) : undefined;
    return [{ id, title: summary.title?.trim() ?? '', blank: summary.blank, updatedAt, order, activityStamp, cwd: summary.cwd, workspace: workspaceBySession.get(id), pinned: isPinned, archived: isArchived, running, childCount, waiting, unread, state, group, pendingWake, timerWakeAt, settledAt, snoozedUntil: group === 'snoozed' ? mark.until : undefined }];
  }).sort((a, b) => {
    const sectionOrder = GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group);
    if (sectionOrder) return sectionOrder;
    if (a.group === 'pinned') return pinnedOrder.get(a.id) - pinnedOrder.get(b.id);
    if (a.group === 'snoozed') return a.snoozedUntil - b.snoozedUntil || compareCatalog(a, b);
    if (a.group === 'settled') return b.settledAt - a.settledAt || compareCatalog(a, b);
    if (a.group === 'working') return b.activityStamp - a.activityStamp || compareCatalog(a, b);
    if (a.group === 'active') {
      const aRank = activeOrder.get(a.id);
      const bRank = activeOrder.get(b.id);
      if (preferences.workingSection === false && (aRank !== undefined || bRank !== undefined)) {
        if (aRank === undefined) return -1;
        if (bRank === undefined) return 1;
        return aRank - bRank;
      }
      if (preferences.workingSection !== false) {
        const aReturn = Math.max(a.activityStamp, preferences.returnedAt?.[a.id] ?? 0, a.timerWakeAt ?? 0);
        const bReturn = Math.max(b.activityStamp, preferences.returnedAt?.[b.id] ?? 0, b.timerWakeAt ?? 0);
        return bReturn - aReturn || compareCatalog(a, b);
      }
      return (preferences.sort === 'oldest' ? a.activityStamp - b.activityStamp : b.activityStamp - a.activityStamp) || compareCatalog(a, b);
    }
    return compareCatalog(a, b);
  });
}

// Observe transitions only: catalog baselines do not establish historical completion times.
export function recordReturns(preferences, previousRows, rows, now) {
  if (!previousRows?.length || !Number.isFinite(now) || now < 0) return preferences;
  const previousById = new Map(previousRows.map(row => [row.id, row]));
  let returnedAt = preferences.returnedAt ?? {};
  let changed = false;
  for (const row of rows) {
    const previous = previousById.get(row.id);
    if (!previous || row.archived || row.group === 'archived' || row.group === 'snoozed') continue;
    const manualMark = preferences.settled[row.id];
    // A child can finish before a root completion reminder exists. Correct an automatic
    // settlement on that observation; an explicit user settlement remains authoritative.
    if (row.group === 'settled' && manualMark !== undefined && manualMark >= (row.activityStamp ?? row.updatedAt)) continue;
    const wasBusy = previous.running === true || previous.childCount > 0;
    const busy = row.running === true || row.childCount > 0;
    if (!(wasBusy && !busy || row.waiting === true && previous.waiting !== true)) continue;
    if ((returnedAt[row.id] ?? -1) >= now) continue;
    if (!changed) returnedAt = { ...returnedAt };
    returnedAt[row.id] = now;
    changed = true;
  }
  return changed ? { ...preferences, returnedAt } : preferences;
}

// A run that ends while the user is elsewhere stays "Done" until that session is opened.
export function recordCompletions(preferences, previousRows, rows, currentId, now) {
  if (!previousRows?.length || !Number.isFinite(now) || now < 0) return preferences;
  const previousById = new Map(previousRows.map(row => [row.id, row]));
  let done = preferences.done ?? {};
  let changed = false;
  const clear = id => {
    if (done[id] === undefined) return false;
    if (!changed) done = { ...done };
    delete done[id];
    changed = true;
    return true;
  };
  for (const row of rows) {
    if (row.id === currentId) { clear(row.id); continue; }
    const previous = previousById.get(row.id);
    if (!previous || row.archived || row.group === 'snoozed' || row.group === 'settled' || row.blank) continue;
    const wasBusy = previous.running === true || previous.childCount > 0;
    const busy = row.running === true || row.childCount > 0;
    if (wasBusy && !busy && !row.waiting) {
      if ((done[row.id] ?? -1) < now) {
        if (!changed) done = { ...done };
        done[row.id] = now;
        changed = true;
      }
      continue;
    }
    // New activity outdates the completion reminder.
    if (busy || (row.activityStamp ?? 0) > (done[row.id] ?? -1)) clear(row.id);
  }
  return changed ? { ...preferences, done } : preferences;
}

export function filterRows(rows, { query = '', workspace = '*', filter = 'all', contentIds = [] } = {}) {
  const q = query.trim().toLocaleLowerCase();
  const hits = new Set(contentIds);
  return rows.filter(row => {
    if (filter === 'archived' ? !row.archived : row.archived) return false;
    if (workspace !== '*' && (row.workspace?.workspaceId ?? '') !== workspace) return false;
    if (filter === 'attention' && !row.waiting && !row.unread) return false;
    if (filter === 'working' && !row.running && row.childCount === 0) return false;
    if (q && !hits.has(row.id) && ![row.title, row.id, row.cwd, row.workspace?.title].some(value => value?.toLocaleLowerCase().includes(q))) return false;
    return true;
  });
}

const without = (record, id) => Object.fromEntries(Object.entries(record ?? {}).filter(([key]) => key !== id));
const stampOf = row => row.activityStamp ?? row.updatedAt;

export function settle(preferences, row, at = Date.now()) {
  if (row.archived || row.waiting || row.blank) return preferences;
  return { ...preferences, activeOrder: (preferences.activeOrder ?? []).filter(id => id !== row.id), settled: { ...preferences.settled, [row.id]: stampOf(row) }, settledAt: { ...preferences.settledAt, [row.id]: at }, snoozed: without(preferences.snoozed, row.id), awakened: without(preferences.awakened, row.id) };
}

export function wake(preferences, row) {
  return { ...preferences, awakened: { ...preferences.awakened, [row.id]: stampOf(row) }, settled: without(preferences.settled, row.id), settledAt: without(preferences.settledAt, row.id), snoozed: without(preferences.snoozed, row.id) };
}

export function snooze(preferences, row, until, at = Date.now()) {
  if (row.archived || row.waiting || row.blank || !Number.isFinite(until) || until <= at) return preferences;
  return { ...wake(preferences, row), snoozed: { ...preferences.snoozed, [row.id]: { stamp: stampOf(row), until, snoozedAt: at } } };
}

// Collapsing a shelf preserves only its routed row; visiting does not unpark it.
export function shelfRows(rows, group, currentId, expanded) {
  return rows.filter(row => row.group === group && (expanded || row.id === currentId));
}

// Snapshot before parking. Hidden shelves and co-parked rows are not navigation targets.
export function nextSession(rows, currentId, excludedIds = []) {
  const index = rows.findIndex(row => row.id === currentId);
  if (index < 0) return null;
  const excluded = new Set(excludedIds);
  const ordered = [...rows.slice(index + 1), ...rows.slice(0, index)];
  return ordered.find(row => !excluded.has(row.id) && !row.archived && ['pinned', 'active'].includes(row.group))?.id ?? null;
}

export function reorder(preferences, rows, sessionId, beforeId) {
  if (preferences.workingSection !== false) return preferences;
  const activeIds = rows.filter(row => row.group === 'active').map(row => row.id);
  if (!activeIds.includes(sessionId) || beforeId === sessionId || beforeId !== undefined && !activeIds.includes(beforeId)) return preferences;
  const moved = activeIds.filter(id => id !== sessionId);
  moved.splice(beforeId === undefined ? moved.length : moved.indexOf(beforeId), 0, sessionId);
  const members = new Set(activeIds);
  const complete = [...new Set([...(preferences.activeOrder ?? []), ...activeIds])];
  let cursor = 0;
  const activeOrder = complete.map(id => members.has(id) ? moved[cursor++] : id);
  return { ...preferences, activeOrder };
}
