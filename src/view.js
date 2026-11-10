function createPlugin(React, model, dictionaries, css) {
  const h = React.createElement;
  const NS = 'local.sessionTriage';
  const KEY = 'dsh.local.session-triage.v1';
  const identity = value => value;
  // Draw rounded silhouettes, rather than relying on round joins to soften square paths.
  const glyphs = {
    inbox: ['M7 4.5h10a2 2 0 0 1 1.9 1.4l2 6.2a3 3 0 0 1 .1.9v4.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13a3 3 0 0 1 .1-.9l2-6.2A2 2 0 0 1 7 4.5Z', 'M3.5 12h3.8a1.5 1.5 0 0 1 1.4 1l.3 1a1.5 1.5 0 0 0 1.4 1h3.2a1.5 1.5 0 0 0 1.4-1l.3-1a1.5 1.5 0 0 1 1.4-1h3.8'],
    search: ['M17.5 10.75a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z', 'm15.75 15.75 4.5 4.5'],
    // Native DSH new-chat outline, retaining its 16-unit grid and centered plus.
    compose: ['M2.37091 11.2501C1.58745 9.89288 1.32067 8.29835 1.61969 6.76006C1.91872 5.22177 2.76342 3.8433 3.99826 2.87846C5.2331 1.91362 6.77494 1.42737 8.33988 1.50925C9.90482 1.59113 11.3875 2.23562 12.5149 3.32406C13.6425 4.41269 14.3387 5.87206 14.4754 7.4334C14.612 8.99474 14.18 10.5529 13.2587 11.8209C12.3375 13.0888 10.9891 13.9813 9.46194 14.3337C8.18691 14.628 6.85895 14.5294 5.64989 14.0605C5.1712 13.8748 4.76962 13.4932 4.26534 13.3967C3.67413 13.2835 2.95257 13.5598 2.03794 14.3337', 'M8 5V11', 'M5 8H11'],
    folder: ['M3 8V6.5a2 2 0 0 1 2-2h3.2a2 2 0 0 1 1.4.6l1.8 1.8a2 2 0 0 0 1.4.6H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z'],
    folderPlus: ['M3 8V6.5a2 2 0 0 1 2-2h3.2a2 2 0 0 1 1.4.6l1.8 1.8a2 2 0 0 0 1.4.6H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z', 'M12 10.5v6', 'M9 13.5h6'],
    close: ['m7 7 10 10', 'M17 7 7 17'],
    more: ['M6.5 12a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z', 'M13.25 12a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z', 'M20 12a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z'],
    classic: ['M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5Z', 'M9 4v16', 'M12.5 9h4', 'M12.5 14h4'],
    settings: ['M4 7h4m4 0h8', 'M4 17h8m4 0h4', 'M12 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z', 'M16 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z'],
    filter: ['M4.5 6.5h15', 'M7.5 12h9', 'M10 17.5h4'],
    check: ['m5.5 12 3.7 3.7a.8.8 0 0 0 1.1 0L18.5 7.5'],
    chevron: ['m9 6.5 4.8 4.8a1 1 0 0 1 0 1.4L9 17.5'],
    clock: ['M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z', 'M12 7.5v4a1 1 0 0 0 .5.9l3 1.6'],
    pin: ['M8.5 4h7', 'M9 4v4.5a2 2 0 0 1-.6 1.4l-1.8 1.8a1.5 1.5 0 0 0-.4 1.1v.2a1 1 0 0 0 1 1h9.6a1 1 0 0 0 1-1v-.2a1.5 1.5 0 0 0-.4-1.1l-1.8-1.8a2 2 0 0 1-.6-1.4V4', 'M12 14v6'],
    undo: ['m7.5 5.5-3.1 3.1a1 1 0 0 0 0 1.4l3.1 3.1', 'M4.5 9.3H14a5.5 5.5 0 0 1 0 11h-2'],
    spinner: ['M12 3.5a8.5 8.5 0 1 1-8.5 8.5'],
    alert: ['M10.3 4.5a2 2 0 0 1 3.4 0l7 12.5a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3l7-12.5Z', 'M12 9v4', 'M12 16.5h.01'],
  };
  function Icon({ name = 'inbox', size = 16 }) {
    const nativeChat = name === 'compose';
    return h('svg', { width: size, height: size, viewBox: nativeChat ? '0 0 16 16' : '0 0 24 24', fill: name === 'more' ? 'currentColor' : 'none', stroke: name === 'more' ? 'none' : 'currentColor', strokeWidth: nativeChat ? 1.3 : 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false, className: name === 'spinner' ? 'dst-glyph dst-spinner' : 'dst-glyph' }, ...glyphs[name].map((d, i) => h('path', { key: i, d })));
  }
  function iconButton(name, label, onClick, extra = {}) {
    return h('button', { type: 'button', className: 'dst-icon', title: label, 'aria-label': label, onClick, ...extra }, h(Icon, { name, size: 16 }));
  }
  function age(time, now, t) {
    const minutes = Math.floor(Math.max(0, now - time) / 60000);
    return minutes < 1 ? t('now') : minutes < 60 ? t('minutes', { n: minutes }) : minutes < 1440 ? t('hours', { n: Math.floor(minutes / 60) }) : t('days', { n: Math.floor(minutes / 1440) });
  }
  function wakeTime(time, now) {
    const date = new Date(time);
    const today = new Date(now);
    const clock = date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
    return date.toDateString() === today.toDateString() ? clock : `${date.toLocaleDateString('en', { weekday: 'short' })} ${clock}`;
  }
  function workspaceName(workspace, t) {
    return workspace?.title === 'default-workspace' ? t('defaultWorkspace') : workspace?.title || t('ungrouped');
  }
  function rowTitle(row, t) { return row.blank ? t('draft') : row.title || t('untitled'); }
  function Popover({ label, icon, active, children, align = 'right', className = '', submenu = false, picker = false, value, description }) {
    const [open, setOpen] = React.useState(false);
    const root = React.useRef(null);
    const button = React.useRef(null);
    const menu = React.useRef(null);
    const focusEntry = React.useRef(null);
    const menuId = React.useId();
    const [position, setPosition] = React.useState({ left: 0, top: 0 });
    React.useLayoutEffect(() => {
      if (!open || !menu.current || !button.current) return;
      const element = menu.current;
      element.showPopover();
      const place = () => {
        const anchor = button.current.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        let left = submenu ? anchor.right + 5 : align === 'left' ? anchor.left : anchor.right - box.width;
        if (submenu && left + box.width > window.innerWidth - 8) left = anchor.left - box.width - 5;
        let top = submenu ? anchor.top : anchor.bottom + 6;
        if (top + box.height > window.innerHeight - 8) top = submenu ? window.innerHeight - box.height - 8 : anchor.top - box.height - 6;
        left = Math.max(8, Math.min(left, window.innerWidth - box.width - 8));
        top = Math.max(8, top);
        setPosition(previous => previous.left === left && previous.top === top ? previous : { left, top });
      };
      place();
      const resize = new ResizeObserver(place);
      resize.observe(element);
      if (focusEntry.current) {
        const entries = [...element.querySelectorAll('[role^="menuitem"]:not(:disabled)')];
        const entry = focusEntry.current === 'last' ? entries.at(-1) : entries.find(item => item.getAttribute('aria-checked') === 'true') || entries[0];
        entry?.focus();
        focusEntry.current = null;
      }
      return () => { resize.disconnect(); if (element.matches(':popover-open')) element.hidePopover(); };
    }, [open, align, submenu]);
    React.useEffect(() => {
      if (!open) return;
      const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
      const scroll = event => { if (!menu.current?.contains(event.target)) setOpen(false); };
      const resize = () => setOpen(false);
      document.addEventListener('pointerdown', outside);
      document.addEventListener('scroll', scroll, true);
      window.addEventListener('resize', resize);
      return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', resize); };
    }, [open]);
    const trigger = {
      ref: button, 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': open ? menuId : undefined, 'data-active': active || open,
      onKeyDown: event => {
        if (!open && (submenu ? event.key === 'ArrowRight' : ['ArrowDown', 'ArrowUp'].includes(event.key))) {
          event.preventDefault(); event.stopPropagation(); focusEntry.current = event.key === 'ArrowUp' ? 'last' : 'first'; setOpen(true);
        }
      },
    };
    return h('div', { ref: root, className: 'dst-popover ' + (submenu ? 'dst-submenu ' : '') + className, 'data-open': open, onKeyDown: event => {
      if ((event.key === 'Escape' || (submenu && event.key === 'ArrowLeft')) && open) {
        event.preventDefault(); event.stopPropagation(); setOpen(false); button.current?.focus(); return;
      }
      if (event.key === 'Tab' && open) setOpen(false);
      if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && event.target.closest('[role="menu"]') === menu.current && !event.target.closest('input,select')) {
        const items = [...menu.current.querySelectorAll('[role^="menuitem"]:not(:disabled)')].filter(item => item.closest('[role="menu"]') === menu.current);
        if (items.length) { event.preventDefault(); event.stopPropagation(); const index = items.indexOf(document.activeElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length; items[next].focus(); }
      }
    } },
    submenu ? h('button', { type: 'button', className: 'dst-menu-item dst-submenu-trigger', role: 'menuitem', title: description, onClick: event => { if (event.detail === 0) focusEntry.current = 'first'; setOpen(current => !current); }, ...trigger }, h('span', { className: 'dst-menu-label' }, label), h('span', { className: 'dst-menu-value' }, value, h(Icon, { name: 'chevron', size: 12 }))) : picker ? h('button', { type: 'button', className: 'dst-select-trigger', 'aria-label': label, onClick: event => { if (event.detail === 0) focusEntry.current = 'first'; setOpen(current => !current); }, ...trigger }, value, h('span', { className: 'dst-picker-chevron' }, h(Icon, { name: 'chevron', size: 12 }))) : iconButton(icon, label, () => setOpen(current => !current), trigger),
    open && h('div', { id: menuId, ref: menu, popover: 'manual', className: 'dst-menu', style: position, 'data-menu-material': 'translucent', 'data-submenu': submenu, role: 'menu', 'aria-label': label }, children(() => setOpen(false))));
  }
  function menuItem(text, onClick, extra = {}) {
    const choice = ['menuitemcheckbox', 'menuitemradio'].includes(extra.role);
    return h('button', { type: 'button', className: 'dst-menu-item', role: 'menuitem', onClick, ...extra }, h('span', { className: 'dst-menu-label' }, text), choice && h('span', { className: 'dst-menu-check', 'aria-hidden': true }, extra['aria-checked'] && h(Icon, { name: 'check', size: 14 })));
  }
  function ModeButton({ usePrefs, setMode, t }) {
    const modern = usePrefs(p => p.mode === 'modern');
    const label = t(modern ? 'switchClassic' : 'switchModern');
    return h('button', { type: 'button', className: 'dst-toggle', title: label, 'aria-label': label, 'aria-pressed': modern, onClick: () => setMode(modern ? 'classic' : 'modern') }, h(Icon, { name: modern ? 'inbox' : 'classic', size: 17 }));
  }
  function Setting({ usePrefs, setMode, t }) {
    const mode = usePrefs(p => p.mode);
    return h('div', { className: 'dst-setting' }, h('div', null, h('div', { className: 'dst-setting-title' }, t('modeLabel')), h('div', { className: 'dst-setting-description' }, t('modeDescription'))), h(Popover, { label: t('modeLabel'), picker: true, value: t(mode) }, close => h(React.Fragment, null, ...['classic', 'modern'].map(value => menuItem(t(value), () => { close(); setMode(value); }, { key: value, role: 'menuitemradio', 'aria-checked': mode === value })))));
  }
  function SessionRow({ row, selected, compact, now, t, open, openMenu, useContextMenu, act, renameSession, fail, dragging, dropBefore, onDrag, onDragEnd, onDropRow, onDragOverRow }) {
    const title = rowTitle(row, t);
    const { getTriggerProps } = useContextMenu();
    const [renaming, setRenaming] = React.useState(false);
    const [name, setName] = React.useState('');
    const [customTime, setCustomTime] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const renameRef = React.useRef(null);
    const commitStarted = React.useRef(false);
    const target = row.blank ? undefined : { kind: 'session', value: { sessionId: row.id, displayTitle: row.title } };
    const triggers = getTriggerProps(target);
    const parked = row.group === 'settled' || row.group === 'snoozed';
    const running = row.running || row.childCount > 0;
    const status = row.waiting ? row.state : running ? 'running' : row.unread ? 'unread' : null;
    const statusIcon = row.waiting ? 'alert' : running ? 'spinner' : 'check';
    const hasMeta = Boolean(row.snoozedUntil || row.childCount > 0);
    React.useEffect(() => { if (renaming) { renameRef.current?.focus(); renameRef.current?.select(); } }, [renaming]);
    const startRename = () => { if (!row.blank && !row.archived) { commitStarted.current = false; setName(row.title); setRenaming(true); } };
    const commitRename = async () => {
      if (commitStarted.current) return;
      commitStarted.current = true;
      setRenaming(false);
      const value = name.trim();
      if (!value || value === row.title) return;
      try { await renameSession(row.id, value); } catch (error) { fail(error); }
    };
    const perform = async (kind, value) => {
      setBusy(true);
      try { await act(kind, row, value); } finally { setBusy(false); }
    };
    const snoozeFor = (close, until) => { close(); perform('snooze', until); };
    const nextMorning = () => { const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(9, 0, 0, 0); return date.getTime(); };
    const project = h('span', { className: 'dst-project' }, h('span', { className: 'dst-project-icon' }, h(Icon, { name: 'folder', size: 12 })), !compact && h('span', { className: 'dst-project-name' }, workspaceName(row.workspace, t)), row.pinned && h(Icon, { name: 'pin', size: 11 }));
    const timing = h('span', { className: 'dst-row-timing', 'data-tone': row.waiting ? 'warning' : running ? 'running' : row.unread ? 'success' : undefined }, row.snoozedUntil ? h(React.Fragment, null, h(Icon, { name: 'clock', size: 12 }), h('time', { title: new Date(row.snoozedUntil).toLocaleString('en') }, wakeTime(row.snoozedUntil, now))) : status ? h(React.Fragment, null, h(Icon, { name: statusIcon, size: 12 }), t(status)) : h('time', { dateTime: new Date(row.updatedAt).toISOString(), title: new Date(row.updatedAt).toLocaleString('en') }, age(row.updatedAt, now, t)));
    const controls = !row.blank && h('div', { className: 'dst-row-controls' },
      !row.archived && (parked ? iconButton('undo', t(row.group === 'snoozed' ? 'wake' : 'unsettle'), () => perform('wake'), { disabled: busy }) : h(React.Fragment, null,
        h(Popover, { label: t('snooze'), icon: 'clock', className: 'dst-snooze-menu' }, close => h(React.Fragment, null,
          ...[[3600000, 'oneHour'], [10800000, 'threeHours'], [nextMorning() - Date.now(), 'tomorrow'], [604800000, 'nextWeek']].map(([delay, key]) => menuItem(t(key), () => snoozeFor(close, Date.now() + delay), { key, disabled: row.waiting || busy })),
          h('div', { className: 'dst-menu-separator' }),
          h('label', { className: 'dst-custom-time' }, t('snoozeUntil'), h('input', { type: 'datetime-local', value: customTime, 'aria-label': t('snoozeUntil'), onChange: event => setCustomTime(event.target.value) })),
          menuItem(t('applySnooze'), () => { const until = new Date(customTime).getTime(); if (!Number.isFinite(until) || until <= Date.now()) { fail(new Error(t('invalidTime'))); return; } snoozeFor(close, until); }, { disabled: !customTime || row.waiting || busy }))),
        h('button', { type: 'button', className: 'dst-settle', title: t('settleSession'), 'aria-label': t('settleSession'), disabled: row.waiting || busy, onClick: () => perform('settle') }, h(Icon, { name: 'check', size: 13 }), !compact && t('settle')))),
      iconButton('more', t('more'), event => { const box = event.currentTarget.getBoundingClientRect(); openMenu(row, { x: box.left, y: box.bottom }); }, { 'data-context-menu-trigger': '', 'aria-haspopup': 'menu' }));
    return h('article', { className: 'dst-row', 'data-session-id': row.id, 'data-selected': selected, 'data-compact': compact, 'data-dragging': dragging === row.id, 'data-drop-before': dropBefore === row.id, draggable: !row.blank && !renaming, ...triggers,
      onDragStart: event => { if (event.target.closest('input')) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', row.id); event.dataTransfer.effectAllowed = 'move'; onDrag(row.id); },
      onDragEnd, onDragOver: event => { if (dragging && dragging !== row.id) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; onDragOverRow(row.id); } },
      onDrop: event => { if (dragging) { event.preventDefault(); event.stopPropagation(); onDropRow(row); } },
    },
      h('button', { type: 'button', className: 'dst-open', 'data-session-open': row.id, 'aria-current': selected ? 'page' : undefined, 'aria-label': `${title} · ${t(row.state)}`, title: [title, row.cwd, t(row.state)].filter(Boolean).join('\n'), onClick: () => open(row), onDoubleClick: startRename },
        compact ? h('span', { className: 'dst-slim-content' }, project, h('span', { className: 'dst-title' }, title), timing) : h(React.Fragment, null,
          h('span', { className: 'dst-project-line' }, project, timing),
          h('span', { className: 'dst-title', 'data-renaming': renaming }, title),
          hasMeta && h('span', { className: 'dst-meta-line' }, row.snoozedUntil ? h('time', { className: 'dst-snoozed-time', title: new Date(row.snoozedUntil).toLocaleString('en') }, h(Icon, { name: 'clock', size: 11 }), new Date(row.snoozedUntil).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })) : h('span', { className: 'dst-child-count', title: t('children') }, row.childCount, ' ', t('children'))))),
      renaming && h('input', { ref: renameRef, className: 'dst-rename', 'aria-label': t('rename'), title: t('renameHint'), value: name, onChange: event => setName(event.target.value), onBlur: commitRename, onKeyDown: event => { event.stopPropagation(); if (event.nativeEvent.isComposing) return; if (event.key === 'Enter') { event.preventDefault(); commitRename(); } if (event.key === 'Escape') { commitStarted.current = true; setRenaming(false); } } }),
      controls);
  }
  function Browser(props) {
    const { wide, expandSidebar, usePrefs, useSaveError, useSessions, useWorkspaces, useSessionStatus, usePanelInfo, useRemoteAccess, useContextMenu, setView, setMode, openSession, startSession, openMenu, searchSessions, renameSession, setPinned, addWorkspace, t } = props;
    const preferences = usePrefs(identity);
    const saveError = useSaveError(identity);
    const list = useSessions(identity);
    const workspaces = useWorkspaces(identity);
    const statuses = useSessionStatus(identity);
    const panelActive = usePanelInfo(info => info.activePanelId !== null);
    const canCreate = useRemoteAccess('session/create');
    const [query, setQuery] = React.useState('');
    const [project, setProject] = React.useState('*');
    const [archived, setArchived] = React.useState(false);
    const [now, setNow] = React.useState(Date.now);
    const [note, setNote] = React.useState(null);
    const [searchIndex, setSearchIndex] = React.useState(0);
    const [remote, setRemote] = React.useState({ query: '', items: [], phase: 'idle', hasMore: false });
    const [dragging, setDragging] = React.useState(null);
    const [dropBefore, setDropBefore] = React.useState(null);
    const searchRef = React.useRef(null);
    const rootRef = React.useRef(null);
    const q = query.trim();
    const current = model.mainSessionId(list);
    const rows = React.useMemo(() => model.deriveRows(list, workspaces, statuses, preferences, now), [list, workspaces, statuses, preferences, now]);
    const visible = React.useMemo(() => model.filterRows(rows, { query, workspace: project, filter: archived ? 'archived' : 'all', contentIds: remote.query === q ? remote.items.map(item => item.sessionId) : [] }), [rows, query, project, archived, remote, q]);
    const latest = React.useRef(null);
    latest.current = { current, panelActive, visible, rows };
    const fail = error => setNote({ text: `${t('failed')}: ${error?.message || String(error)}`, error: true });
    React.useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
    React.useEffect(() => { if (!note || note.error) return; const timer = setTimeout(() => setNote(null), 7000); return () => clearTimeout(timer); }, [note]);
    React.useEffect(() => { setSearchIndex(0); }, [q, project, archived]);
    React.useEffect(() => {
      if (!q) { setRemote({ query: '', items: [], phase: 'idle', hasMore: false }); return; }
      const controller = new AbortController();
      setRemote({ query: q, items: [], phase: 'loading', hasMore: false });
      const timer = setTimeout(() => searchSessions(q, controller.signal).then(result => { if (!controller.signal.aborted) setRemote({ query: q, items: result.items, hasMore: result.hasMore, phase: 'ready' }); }).catch(() => { if (!controller.signal.aborted) setRemote({ query: q, items: [], phase: 'error', hasMore: false }); }), 250);
      return () => { clearTimeout(timer); controller.abort(); };
    }, [q, searchSessions]);
    React.useEffect(() => { if (project !== '*' && project !== '' && !workspaces.items.some(w => w.workspaceId === project)) setProject('*'); }, [project, workspaces.items]);
    const previousRows = React.useRef(null);
    React.useEffect(() => {
      const previous = previousRows.current;
      previousRows.current = rows;
      if (previous) setView(p => model.recordReturns(p, previous, rows, Date.now()));
    }, [rows, setView]);
    React.useEffect(() => {
      const waking = rows.filter(row => row.pendingWake);
      if (waking.length) setView(p => waking.reduce((next, row) => model.wake(next, row), p));
    }, [rows, setView]);
    const open = row => {
      if (row.archived) { setNote({ text: t('restoreFirst'), error: true }); return; }
      openSession(row.id);
    };
    const act = async (kind, row, value) => {
      const before = preferences;
      const wasPinned = row.pinned;
      try {
        if (['settle', 'snooze'].includes(kind) && row.waiting) return;
        if (['settle', 'snooze', 'active'].includes(kind) && wasPinned) await setPinned(row.id, false);
        if (kind === 'pin') { await setPinned(row.id, true); setView(p => model.wake(p, row)); }
        else if (kind === 'settle') setView(p => model.settle(p, row, Date.now()));
        else if (kind === 'snooze') setView(p => model.snooze(p, row, value));
        else setView(p => ({ ...model.wake(p, row), returnedAt: { ...p.returnedAt, [row.id]: Date.now() } }));
        setNote({ text: t(kind === 'settle' ? 'settledNotice' : kind === 'snooze' ? 'snoozedNotice' : kind === 'pin' ? 'pinNotice' : 'wakeNotice'), undo: async () => {
          try {
            if (kind === 'pin' && !wasPinned) await setPinned(row.id, false);
            if (wasPinned && ['settle', 'snooze', 'active'].includes(kind)) await setPinned(row.id, true);
            setView(p => {
              const restored = { ...p };
              for (const key of ['settled', 'settledAt', 'snoozed', 'awakened', 'returnedAt']) {
                restored[key] = { ...(p[key] || {}) };
                if (before[key]?.[row.id] === undefined) delete restored[key][row.id]; else restored[key][row.id] = before[key][row.id];
              }
              return restored;
            });
            if (row.id === current) openSession(row.id);
            setNote(null);
          } catch (error) { fail(error); }
        } });
        if (['settle', 'snooze'].includes(kind) && row.id === latest.current.current && !latest.current.panelActive) {
          const next = model.nextSession(latest.current.visible, row.id);
          if (next) openSession(next); else if (canCreate) startSession(project && project !== '*' ? project : undefined);
        }
      } catch (error) { fail(error); }
    };
    const clearDrag = () => { setDragging(null); setDropBefore(null); };
    const dropInto = async (group, beforeId) => {
      const row = rows.find(item => item.id === dragging);
      clearDrag();
      if (!row) return;
      if (group === 'active' && row.group === 'active') { if (!preferences.workingSection) setView(p => model.reorder(p, rows, row.id, beforeId)); return; }
      if (group === 'active') {
        if (preferences.workingSection && (row.running || row.childCount > 0)) return;
        await act('active', row);
        if (beforeId && !preferences.workingSection) setView(p => model.reorder(p, rows.map(item => item.id === row.id ? { ...item, group: 'active' } : item), row.id, beforeId));
      }
      if (group === 'pinned') await act('pin', row);
      if (group === 'settled') await act('settle', row);
      if (group === 'snoozed') await act('snooze', row, Date.now() + 3600000);
    };
    const rowElement = (row, compact = false) => h(SessionRow, { key: row.id, row, compact, selected: !panelActive && row.id === current, now, t, open, openMenu, useContextMenu, act, renameSession, fail, dragging, dropBefore, onDrag: setDragging, onDragEnd: clearDrag, onDragOverRow: setDropBefore, onDropRow: destination => dropInto(destination.group, destination.id) });
    const groupZone = (key, children) => h('section', { key, className: 'dst-top-group', 'data-drop-group': key, 'aria-label': t(key), onDragOver: event => { if (dragging) event.preventDefault(); }, onDrop: event => { if (dragging) { event.preventDefault(); dropInto(key); } } }, h('h3', { className: dragging ? 'dst-drag-label' : 'dst-sr-only' }, t(key)), children);
    const shelf = key => {
      const members = visible.filter(row => row.group === key);
      if (!members.length && !((key === 'settled' && visible.length > 0 && !archived) || (dragging && ['snoozed', 'settled'].includes(key)))) return null;
      const expanded = preferences.collapsed[key] === false;
      const shown = model.shelfRows(visible, key, panelActive ? null : current, expanded);
      return h('section', { key, className: 'dst-shelf', 'aria-label': t(key), onDragOver: event => { if (dragging && key !== 'working') event.preventDefault(); }, onDrop: event => { if (dragging && key !== 'working') { event.preventDefault(); dropInto(key); } } },
        h('button', { type: 'button', className: 'dst-shelf-heading', 'aria-expanded': expanded, onClick: () => setView(p => ({ ...p, collapsed: { ...p.collapsed, [key]: expanded } })) }, h('span', null, t(key)), h('span', { className: 'dst-shelf-count' }, members.length), h('span', { className: 'dst-shelf-chevron', 'data-expanded': expanded }, h(Icon, { name: 'chevron', size: 12 }))),
        ...shown.map(row => rowElement(row, key !== 'working')));
    };
    const currentSearch = visible[Math.min(searchIndex, Math.max(0, visible.length - 1))];
    const projectScope = h(Popover, { label: t('projects'), icon: 'filter', active: project !== '*', align: 'right' }, close => h(React.Fragment, null,
      ...[{ workspaceId: '*', title: t('allProjects') }, ...workspaces.items, { workspaceId: '', title: t('ungrouped') }].map(workspace => menuItem(workspaceName(workspace, t), () => { setProject(workspace.workspaceId); close(); }, { key: workspace.workspaceId, role: 'menuitemradio', 'aria-checked': project === workspace.workspaceId }))));
    if (!wide) return h('div', { className: 'dst-root dst-rail' }, iconButton('inbox', t('expand'), expandSidebar));
    return h('section', { ref: rootRef, className: 'dst-root', 'aria-label': t('sessions'), 'data-session-triage': 'modern', lang: 'en', onKeyDown: event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.target.closest('input,select,[role="menu"]')) return;
      const buttons = [...rootRef.current.querySelectorAll('[data-session-open]')];
      const index = buttons.indexOf(event.target);
      if (index >= 0 && buttons.length) { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus(); }
    } },
      h('div', { className: 'dst-toolbar' },
        h('div', { className: 'dst-search-wrap' }, h(Icon, { name: 'search', size: 15 }), h('input', { ref: searchRef, className: 'dst-search', type: 'search', placeholder: t('search'), 'aria-label': t('searchLabel'), value: query, onChange: event => setQuery(event.target.value), onKeyDown: event => {
          if (event.key === 'Escape') { event.stopPropagation(); setQuery(''); }
          if (q && ['ArrowDown', 'ArrowUp'].includes(event.key) && visible.length) { event.preventDefault(); setSearchIndex(index => (index + (event.key === 'ArrowUp' ? -1 : 1) + visible.length) % visible.length); }
          if (q && event.key === 'Enter' && currentSearch) { event.preventDefault(); open(currentSearch); }
        } }), q && iconButton('close', t('clear'), () => { setQuery(''); searchRef.current?.focus(); })),
        projectScope,
        iconButton('folderPlus', t('addWorkspace'), async () => { try { const workspace = await addWorkspace(); if (workspace) { setProject(workspace.workspaceId); startSession(workspace.workspaceId); } } catch (error) { fail(error); } }),
        canCreate && iconButton('compose', t('new'), () => startSession(project && project !== '*' ? project : undefined)),
        h(Popover, { label: t('options'), icon: 'more' }, close => h(React.Fragment, null,
          menuItem(t('workingSection'), () => setView(p => ({ ...p, workingSection: !p.workingSection })), { role: 'menuitemcheckbox', 'aria-checked': preferences.workingSection }),
          menuItem(t('showArchived'), () => { setArchived(value => !value); close(); }, { role: 'menuitemcheckbox', 'aria-checked': archived }),
          h('div', { className: 'dst-menu-separator', role: 'separator' }),
          h('div', { className: 'dst-menu-heading', role: 'presentation' }, t('sort')),
          ...['newest', 'oldest'].map(value => menuItem(t(value), () => { setView(p => ({ ...p, sort: value, activeOrder: [] })); close(); }, { key: value, role: 'menuitemradio', 'aria-checked': preferences.sort === value })),
          h('div', { className: 'dst-menu-separator', role: 'separator' }),
          h(Popover, { label: t('autoSettle'), submenu: true, description: t('localHint'), value: t(({ 0: 'never', 6: 'sixHours', 24: 'oneDay', 72: 'threeDays', 168: 'oneWeek' })[preferences.autoSettleHours]) }, closeSubmenu => h(React.Fragment, null,
            ...[[0, 'never'], [6, 'sixHours'], [24, 'oneDay'], [72, 'threeDays'], [168, 'oneWeek']].map(([value, key]) => menuItem(t(key), () => { setView(p => ({ ...p, autoSettleHours: value })); closeSubmenu(); close(); }, { key, role: 'menuitemradio', 'aria-checked': preferences.autoSettleHours === value })))),
          h('div', { className: 'dst-menu-separator', role: 'separator' }), menuItem(t('switchClassic'), () => { close(); setMode('classic'); })))),
      (project !== '*' || archived) && h('div', { className: 'dst-scope-line' }, h('span', null, archived ? t('archived') : workspaceName(workspaces.items.find(item => item.workspaceId === project), t)), iconButton('close', t('clear'), () => { setProject('*'); setArchived(false); })),
      saveError && h('div', { role: 'status', className: 'dst-notice dst-error' }, t('storageError')),
      note && h('div', { role: note.error ? 'alert' : 'status', className: 'dst-notice', 'data-error': note.error }, h('span', null, note.text), note.undo && h('button', { type: 'button', onClick: note.undo }, t('undo')), iconButton('close', t('close'), () => setNote(null))),
      q && remote.phase === 'loading' && h('div', { className: 'dst-search-note', role: 'status' }, t('searching')),
      q && remote.phase === 'error' && h('div', { className: 'dst-search-note', role: 'status' }, t('searchFailed')),
      h('nav', { className: 'dst-threads', 'aria-label': t('sessions') },
        q ? h('section', { 'aria-label': t('results'), className: 'dst-search-results' }, ...visible.map((row, index) => h('div', { key: row.id, 'data-search-selected': index === searchIndex }, rowElement(row, true))), !visible.length && h('p', { className: 'dst-empty' }, t(list.phase !== 'ready' ? 'loading' : 'noMatch')), remote.hasMore && h('p', { className: 'dst-search-note' }, t('limited', { n: remote.items.length }))) : h(React.Fragment, null,
          (visible.some(row => row.group === 'pinned') || dragging) && groupZone('pinned', visible.filter(row => row.group === 'pinned').map(row => rowElement(row))),
          groupZone('active', visible.filter(row => row.group === 'active').map(row => rowElement(row))),
          visible.length === 0 && h('div', { className: 'dst-empty' }, t(list.phase !== 'ready' ? 'loading' : 'empty'), canCreate && h('button', { type: 'button', className: 'dst-empty-action', onClick: () => startSession(project && project !== '*' ? project : undefined) }, t('new'))),
          h('div', { className: 'dst-shelves' }, ...['working', 'snoozed', 'settled', 'archived'].map(shelf))))
    );
  }
  return {
    inject: ['slots', 'locale', 'uiWorkspace', 'sessions', 'contextMenus', 'workspaces'],
    apply(ctx) {
      try {
        const slots = ctx.get('slots');
        const locale = ctx.get('locale');
        const navigation = ctx.get('uiWorkspace');
        const sessions = ctx.get('sessions');
        const menus = ctx.get('contextMenus');
        const workspaceStore = ctx.get('workspaces');
        ctx.effect(() => slots.onEntryError((slot, entry, error) => {
          if ([Browser, ModeButton, Setting].includes(entry.component)) console.error('[session-triage] render failed in ' + slot, error instanceof Error ? error.stack : String(error));
        }));
        let saved;
        let saveError = false;
        try { saved = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { saveError = true; }
        let preferences = model.normalizePreferences(saved);
        const listeners = new Set();
        const errorListeners = new Set();
        const prefs = { getSnapshot: () => preferences, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
        const errors = { getSnapshot: () => saveError, subscribe: fn => { errorListeners.add(fn); return () => errorListeners.delete(fn); } };
        const publish = () => { for (const fn of [...listeners]) fn(); };
        const setView = change => {
          const changed = change(preferences);
          if (changed === preferences) return preferences;
          const next = model.normalizePreferences(changed);
          try { localStorage.setItem(KEY, JSON.stringify(next)); saveError = false; } catch { saveError = true; }
          preferences = next;
          for (const fn of errorListeners) fn();
          publish();
        };
        const setMode = mode => setView(p => ({ ...p, mode }));
        const injected = () => ({ hooks: { prefs, saveError: errors }, setView, setMode });
        // English-first UI, scoped to this plugin; the application's language is untouched.
        const english = Object.fromEntries(Object.entries(dictionaries.en).filter(([, value]) => typeof value === 'string'));
        ctx.effect(() => locale.register(NS, { en: english, zh: english }), 'session-triage: locales');
        ctx.effect(() => {
          const onStorage = event => { if (event.key === KEY) { try { preferences = model.normalizePreferences(JSON.parse(event.newValue ?? 'null')); publish(); } catch {} } };
          window.addEventListener('storage', onStorage);
          return () => window.removeEventListener('storage', onStorage);
        }, 'session-triage: preferences');
        slots.inject('sidebar.footer.action', () => slots.register({ name: 'sidebar.footer.action', id: 'session-triage.mode', order: 20, locale: NS, inject: injected }, ModeButton));
        slots.inject('settings.general.item', () => slots.register({ name: 'settings.general.item', id: 'session-triage.mode', order: 13, locale: NS, inject: injected }, Setting));
        slots.inject('sidebar.workspaces', () => {
          let disposeBrowser;
          const refreshMode = () => {
            if (preferences.mode === 'classic') { disposeBrowser?.(); disposeBrowser = undefined; return; }
            if (disposeBrowser) return;
            disposeBrowser = slots.register({
              name: 'sidebar.workspaces', priority: -50, locale: NS,
              inject: () => ({ ...injected(),
                openSession: id => navigation.openSession(id),
                startSession: workspace => navigation.startSession(workspace),
                openMenu: (row, point) => menus.open({ kind: 'session', value: { sessionId: row.id, displayTitle: row.title } }, point),
                setPinned: (id, value) => value ? workspaceStore.pinSession(id) : workspaceStore.unpinSession(id),
                addWorkspace: async () => { const path = await navigation.pickDirectory(); return path ? workspaceStore.create({ path }) : null; },
                renameSession: (id, title) => sessions.using(id, { source: 'controllerOperation' }, async reference => { await reference.ready; const result = await reference.binding.session.rename(title); if (!result.ok) throw new Error(result.error.message); }),
                searchSessions: async (query, signal) => { const result = await sessions.search(query, signal); if (!result.ok) throw new Error(result.error.message); return result.value; },
              }),
            }, Browser);
          };
          refreshMode();
          const stop = prefs.subscribe(refreshMode);
          return () => { stop(); disposeBrowser?.(); };
        });
        slots.inject('shell.overlay', () => slots.register({ name: 'shell.overlay', id: 'session-triage.styles', order: -100 }, () => h('style', null, css)));
      } catch (error) {
        console.error('[session-triage] activation failed', error instanceof Error ? error.stack : String(error));
        throw error;
      }
    },
  };
}
