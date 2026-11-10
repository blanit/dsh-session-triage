export const DEFAULTS = { mode: 'modern', workingSection: true, sort: 'newest', activeOrder: [], autoSettleHours: 24, returnedAt: {}, settled: {}, settledAt: {}, snoozed: {}, awakened: {}, collapsed: {} };
export const GROUPS = ['pinned', 'active', 'working', 'snoozed', 'settled', 'archived'];

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
    returnedAt: numbers(value.returnedAt), settled: numbers(value.settled), settledAt: numbers(value.settledAt), snoozed, awakened: numbers(value.awakened),
    collapsed: Object.fromEntries(Object.entries(value.collapsed ?? {}).filter(([key, flag]) => GROUPS.includes(key) && typeof flag === 'boolean')),
  };
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
    const unread = status?.completionUnread === true;
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
