/* MA-ZEN — db.js  (localStorage database layer)
   Exposes: MAZEN_DB (module 8-12 pages) and MazenDB (app.html)
   Self-contained, no external dependencies
--------------------------------------------------------------- */
(function(window) {
  'use strict';

  /* ── INLINE PROTOCOL DATA (GitHub Pages compat — no fetch needed) ── */
  const PROTOCOL_DATA = [
    {
      id: 'SEIJAKU', slug: 'seijaku', title: '静寂', romanji: 'SEIJAKU',
      subtitle: 'Deep stillness · the silence beneath silence',
      season: 'winter', duration_min: 30, silence_density: 0.68,
      outcome: 'FOCUS', tags: ['focus','deep-work','clarity'],
      intent: 'Clear mental noise before sustained cognitive work.',
      for: ['Deep work blocks','Before reading or writing','Mental clarity'],
      not_for: ['Active creative sessions','When you need quick energy'],
      phases: [
        { label: 'ENTRY', duration_sec: 120, silence_ratio: 0.45, cue: 'Let the noise of the day settle' },
        { label: 'DESCENT', duration_sec: 480, silence_ratio: 0.72, cue: 'Follow the breath without directing it' },
        { label: 'STILLNESS', duration_sec: 900, silence_ratio: 0.88, cue: 'Rest in the space between thoughts' },
        { label: 'RETURN', duration_sec: 300, silence_ratio: 0.52, cue: 'Bring the stillness forward with you' }
      ],
      expected_effect: 'A quiet, clear field for focused work. Thoughts slow; attention narrows.',
      setup_notes: 'Remove all visible notifications. Dim screen if possible.',
      constraints: ['Minimum 20 minutes', 'No background music', 'Silence all devices']
    },
    {
      id: 'MIYABI', slug: 'miyabi', title: '雅', romanji: 'MIYABI',
      subtitle: 'Elegant refinement · precision without effort',
      season: 'spring', duration_min: 35, silence_density: 0.72,
      outcome: 'FOCUS', tags: ['focus','precision','writing'],
      intent: 'Prepare for sustained analytical or creative work requiring structural thought.',
      for: ['Long writing sessions','Deep research','Creative structure'],
      not_for: ['Quick tasks','When you are emotionally activated'],
      phases: [
        { label: 'OPEN', duration_sec: 180, silence_ratio: 0.50, cue: 'Release what was before this moment' },
        { label: 'REFINE', duration_sec: 600, silence_ratio: 0.74, cue: 'Attention sharpens like a blade being drawn' },
        { label: 'SUSTAIN', duration_sec: 960, silence_ratio: 0.82, cue: 'Work from the center, not the surface' },
        { label: 'CLOSE', duration_sec: 360, silence_ratio: 0.55, cue: 'Refinement is the removal of what does not belong' }
      ],
      expected_effect: 'Elevated precision. The sense that thought and action align.',
      setup_notes: 'Best used before long creative or analytical sessions.',
      constraints: ['Minimum 30 minutes', 'Seated, stable posture']
    },
    {
      id: 'AKANE', slug: 'akane', title: '茜', romanji: 'AKANE',
      subtitle: 'Madder red · dusk glow releasing',
      season: 'summer', duration_min: 15, silence_density: 0.48,
      outcome: 'DECOMPRESSION', tags: ['decompression','midday','release'],
      intent: 'Midday reset. Release accumulated tension between meetings.',
      for: ['Midday reset','After difficult conversations','Pre-commute decompression'],
      not_for: ['Before sleep','During high focus needs'],
      phases: [
        { label: 'ARRIVE', duration_sec: 120, silence_ratio: 0.30, cue: 'You are allowed to stop now' },
        { label: 'RELEASE', duration_sec: 360, silence_ratio: 0.52, cue: 'Red becomes amber becomes the nothing that holds everything' },
        { label: 'SETTLE', duration_sec: 420, silence_ratio: 0.55, cue: 'Nothing needs to happen here' }
      ],
      expected_effect: 'Reduced activation. A sense of spaciousness returning.',
      setup_notes: 'Works with eyes closed or open. Can be done seated anywhere.',
      constraints: ['10-20 minutes optimal']
    },
    {
      id: 'GAKE', slug: 'gake', title: '崖', romanji: 'GAKE',
      subtitle: 'The cliff edge · suspension before release',
      season: 'autumn', duration_min: 30, silence_density: 0.55,
      outcome: 'DECOMPRESSION', tags: ['decompression','transition','release'],
      intent: 'After high-intensity work. End-of-day transition to rest.',
      for: ['After intense meetings','End of demanding workday','Transition from urgency'],
      not_for: ['Morning sessions','Before high-output work'],
      phases: [
        { label: 'EDGE', duration_sec: 240, silence_ratio: 0.38, cue: 'You have been holding tension. You can release it now.' },
        { label: 'FALL', duration_sec: 600, silence_ratio: 0.58, cue: 'The drop is not failure. The drop is the thing.' },
        { label: 'LAND', duration_sec: 480, silence_ratio: 0.62, cue: 'Rest in the aftermath of effort' },
        { label: 'CLOSE', duration_sec: 480, silence_ratio: 0.68, cue: 'Carry lightness into what comes next' }
      ],
      expected_effect: 'Significant reduction in activation. Arrival at rest.',
      setup_notes: 'Best after demanding or emotional work periods.',
      constraints: ['20-45 minutes', 'Lying down or reclined permitted']
    },
    {
      id: 'MIZU', slug: 'mizu', title: '水', romanji: 'MIZU',
      subtitle: 'Water · flowing release',
      season: 'summer', duration_min: 25, silence_density: 0.58,
      outcome: 'DECOMPRESSION', tags: ['decompression','end-of-day','flow'],
      intent: 'End-of-day decompression. Releasing accumulated emotional labour.',
      for: ['End of work day','After emotional labour','Releasing the weight of the day'],
      not_for: ['Morning activation'],
      phases: [
        { label: 'SURFACE', duration_sec: 180, silence_ratio: 0.35, cue: 'Water does not hold its shape' },
        { label: 'CURRENT', duration_sec: 540, silence_ratio: 0.60, cue: 'Flow without choosing direction' },
        { label: 'DEEP', duration_sec: 600, silence_ratio: 0.70, cue: 'This is its power — to move without resistance' },
        { label: 'SHORE', duration_sec: 180, silence_ratio: 0.45, cue: 'Arrive without effort' }
      ],
      expected_effect: 'Gentle deactivation. The day releases its hold.',
      setup_notes: 'Comfortable position. Allow thoughts to pass without engagement.',
      constraints: ['20-30 minutes']
    },
    {
      id: 'KAZE', slug: 'kaze', title: '風', romanji: 'KAZE',
      subtitle: 'Wind and force · entry protocol',
      season: 'spring', duration_min: 15, silence_density: 0.62,
      outcome: 'TRANSITION', tags: ['entry','beginners','transition','any-time'],
      intent: 'Entry protocol. First session or any-time reset.',
      for: ['First session — no prior experience needed','Any time of day','Before a meeting or decision'],
      not_for: ['Rung 3+ practitioners seeking depth'],
      phases: [
        { label: 'ARRIVE', duration_sec: 120, silence_ratio: 0.40, cue: 'The wind does not choose its direction. It is the direction.' },
        { label: 'OPEN', duration_sec: 420, silence_ratio: 0.65, cue: 'No preparation is required. You are already here.' },
        { label: 'MOVE', duration_sec: 360, silence_ratio: 0.70, cue: 'Allow the session to end when it ends' }
      ],
      expected_effect: 'Orientation. A sense of having been somewhere and returned.',
      setup_notes: 'Appropriate for all levels. Best introduction to the system.',
      constraints: ['10-20 minutes']
    },
    {
      id: 'KEIRO', slug: 'keiro', title: '径', romanji: 'KEIRO',
      subtitle: 'Path · the route through difficult terrain',
      season: 'autumn', duration_min: 30, silence_density: 0.63,
      outcome: 'TRANSITION', tags: ['transition','decision','navigation'],
      intent: 'Navigate uncertainty. Before or after significant decisions.',
      for: ['Before a difficult decision','Navigating uncertainty','Significant role change'],
      not_for: ['When clarity is already present'],
      phases: [
        { label: 'THRESHOLD', duration_sec: 180, silence_ratio: 0.42, cue: 'The path does not end at the obstacle' },
        { label: 'TRAVERSE', duration_sec: 720, silence_ratio: 0.68, cue: 'The path goes through it' },
        { label: 'CLEARING', duration_sec: 480, silence_ratio: 0.72, cue: 'What was difficult is now behind you' },
        { label: 'FORWARD', duration_sec: 420, silence_ratio: 0.58, cue: 'You did not find the path. You made it.' }
      ],
      expected_effect: 'Reduced paralysis. The sense of a way forward.',
      setup_notes: 'Hold the decision or uncertainty in mind loosely during THRESHOLD phase.',
      constraints: ['20-45 minutes', 'Bring no predetermined answer']
    },
    {
      id: 'HI', slug: 'hi', title: '火', romanji: 'HI',
      subtitle: 'Fire · complete clearing',
      season: 'summer', duration_min: 25, silence_density: 0.70,
      outcome: 'RESET', tags: ['reset','clearing','new-beginning'],
      intent: 'Complete reset. After failure, ending, or before new beginning.',
      for: ['After a significant failure or ending','The session before something entirely new','Complete clearing'],
      not_for: ['Casual use', 'When in acute emotional distress'],
      phases: [
        { label: 'IGNITION', duration_sec: 240, silence_ratio: 0.48, cue: 'Fire does not apologise for what it consumes' },
        { label: 'BURN', duration_sec: 600, silence_ratio: 0.74, cue: 'Let what was be consumed' },
        { label: 'EMBER', duration_sec: 480, silence_ratio: 0.78, cue: 'From this, something new' },
        { label: 'ASH', duration_sec: 180, silence_ratio: 0.85, cue: 'The field is clear' }
      ],
      expected_effect: 'A sense of completion and readiness. Ending fully honoured.',
      setup_notes: 'Do not use this protocol casually. It requires intention.',
      constraints: ['20-30 minutes', 'Use intentionally']
    },
    {
      id: 'SHINKIRO', slug: 'shinkiro', title: '蜃気楼', romanji: 'SHINKIRO',
      subtitle: 'Mirage · the shimmer at the threshold of reality',
      season: 'experimental', duration_min: 30, silence_density: 0.78,
      outcome: 'REFLECTION', tags: ['reflection','journaling','integration'],
      intent: 'Integration. After a significant experience or decision.',
      for: ['Journaling or reflective writing sessions','After making a difficult decision','Integrating a significant experience'],
      not_for: ['Before needing to act quickly', 'When avoiding reflection'],
      phases: [
        { label: 'SHIMMER', duration_sec: 180, silence_ratio: 0.55, cue: 'The mirage does not lie. It shows you what you are looking for.' },
        { label: 'THRESHOLD', duration_sec: 540, silence_ratio: 0.80, cue: 'Sit with what you know but have not yet seen' },
        { label: 'DISSOLVE', duration_sec: 720, silence_ratio: 0.88, cue: 'Let understanding arrive without forcing it' },
        { label: 'INTEGRATION', duration_sec: 360, silence_ratio: 0.72, cue: 'Bring what you have found into the open' }
      ],
      expected_effect: 'Integration. A sense of seeing something previously obscured.',
      setup_notes: 'Have a journal nearby but do not write during the session.',
      constraints: ['20-45 minutes', 'Minimum Rung 2']
    },
    {
      id: 'FUSOKU', slug: 'fusoku', title: '不足', romanji: 'FUSOKU',
      subtitle: 'Insufficiency · not-enough as a teacher',
      season: 'winter', duration_min: 40, silence_density: 0.88,
      outcome: 'REFLECTION', tags: ['reflection','advanced','depth'],
      intent: 'Advanced reflection. Sitting with incompleteness as a structural condition.',
      for: ['Rung 5 practitioners only','Extended introspective sessions','When sitting with incompleteness'],
      not_for: ['Beginners', 'When seeking comfort'],
      phases: [
        { label: 'ACKNOWLEDGE', duration_sec: 300, silence_ratio: 0.70, cue: 'Not-enough is not a failure state. It is the original condition.' },
        { label: 'INHABIT', duration_sec: 900, silence_ratio: 0.90, cue: 'Remain with what is insufficient. Do not fix it.' },
        { label: 'RECEIVE', duration_sec: 900, silence_ratio: 0.92, cue: 'What does insufficiency teach when it is not resisted?' },
        { label: 'REST', duration_sec: 300, silence_ratio: 0.85, cue: 'This is where growth begins — not from fullness, but from lack' }
      ],
      expected_effect: 'Deep integration of limitation. Paradoxical sense of completeness.',
      setup_notes: 'Rung 5+ only. Not for casual use.',
      constraints: ['35-45 minutes', 'Rung 5 minimum', 'Do not use in emotional distress']
    },
    {
      id: 'TAKE', slug: 'take', title: '竹', romanji: 'TAKE',
      subtitle: 'Bamboo clarity · morning intention',
      season: 'spring', duration_min: 20, silence_density: 0.60,
      outcome: 'REFLECTION', tags: ['reflection','morning','intention'],
      intent: 'Beginning of the day with intention. Hold a question for the day.',
      for: ['Beginning of the day','You have a question to hold','Morning or early session'],
      not_for: ['Evening use', 'When avoiding quiet'],
      phases: [
        { label: 'DAWN', duration_sec: 180, silence_ratio: 0.42, cue: 'The bamboo does not bend to prepare for the storm' },
        { label: 'INTENTION', duration_sec: 480, silence_ratio: 0.62, cue: 'What is the question you bring to this day?' },
        { label: 'HOLD', duration_sec: 540, silence_ratio: 0.70, cue: 'It bends in the storm and returns. So will you.' }
      ],
      expected_effect: 'Clarified intention for the day. A question to carry forward.',
      setup_notes: 'Identify one question to hold before beginning.',
      constraints: ['15-30 minutes', 'Morning recommended']
    },
    {
      id: 'YUKI', slug: 'yuki', title: '雪', romanji: 'YUKI',
      subtitle: 'Snow silence · the weight of white',
      season: 'winter', duration_min: 45, silence_density: 0.86,
      outcome: 'FOCUS', tags: ['focus','advanced','deep-work','extended'],
      intent: 'Extended deep work requiring extreme stillness. Advanced practitioners.',
      for: ['Extended deep work','Rung 4+ practitioners','Long-form creative or analytical sessions'],
      not_for: ['Beginners', 'Short sessions'],
      phases: [
        { label: 'SETTLE', duration_sec: 300, silence_ratio: 0.60, cue: 'The snow does not fall. It arrives.' },
        { label: 'LAYER', duration_sec: 900, silence_ratio: 0.88, cue: 'Let silence accumulate like snow — without effort' },
        { label: 'DEEP', duration_sec: 1200, silence_ratio: 0.92, cue: 'Work from inside the silence, not against it' },
        { label: 'SURFACE', duration_sec: 300, silence_ratio: 0.75, cue: 'Return carrying what you have found' }
      ],
      expected_effect: 'Extreme depth of focus. Thought becomes precise and structural.',
      setup_notes: 'Rung 4+ recommended. Full environment preparation required.',
      constraints: ['40-45 minutes', 'Rung 4 minimum', 'No interruptions possible']
    }
  ];

  /* ── DB CLASS ── */
  class MazenDatabase {
    constructor() {
      this._protocols = null;
    }

    /* ── PROTOCOLS ── */
    async loadProtocols() {
      if (this._protocols) return this._protocols;
      // Use inline data — no fetch needed for GitHub Pages / file://
      this._protocols = PROTOCOL_DATA;
      return this._protocols;
    }

    getProtocols() {
      return this._protocols || PROTOCOL_DATA;
    }

    getProtocolById(idOrSlug) {
      const ps = this.getProtocols();
      return ps.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
    }

    /* ── SESSIONS ── */
    getSessions() {
      try {
        return JSON.parse(localStorage.getItem('mz:sessions') || '[]');
      } catch { return []; }
    }

    saveSession(session) {
      const sessions = this.getSessions();
      const idx = sessions.findIndex(s => s.id === session.id);
      if (idx >= 0) sessions[idx] = session;
      else sessions.unshift(session);
      localStorage.setItem('mz:sessions', JSON.stringify(sessions));
      this.updateStreak(session);
      return session;
    }

    getLastSession() {
      return this.getSessions()[0] || null;
    }

    getSessionsByProtocol(protocolId) {
      return this.getSessions().filter(s => s.protocolId === protocolId);
    }

    completeSession(sessionId, actualSeconds) {
      const sessions = this.getSessions();
      const s = sessions.find(s => s.id === sessionId);
      if (!s) return;
      s.completed = true;
      s.elapsed = actualSeconds || s.elapsed;
      s.durationMin = Math.round((actualSeconds || s.elapsed) / 60);
      s.progressPct = 100;
      localStorage.setItem('mz:sessions', JSON.stringify(sessions));
      this.updateStreak(s);
    }

    /* ── STREAK ── */
    updateStreak(session) {
      if (!session || !session.completed) return;
      const today = new Date().toDateString();
      let streak = this.getStreak();
      if (streak.lastDate === today) return;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (streak.lastDate === yesterday) {
        streak.current++;
      } else {
        streak.current = 1;
      }
      streak.best = Math.max(streak.best || 0, streak.current);
      streak.lastDate = today;
      localStorage.setItem('mz:streak', JSON.stringify(streak));
    }

    getStreak() {
      try {
        return JSON.parse(localStorage.getItem('mz:streak') || '{"current":0,"best":0,"lastDate":null}');
      } catch { return { current: 0, best: 0, lastDate: null }; }
    }

    /* ── FAVORITES ── */
    getFavorites() {
      try {
        return JSON.parse(localStorage.getItem('mz:favorites') || '[]');
      } catch { return []; }
    }

    isFavorite(id) {
      return this.getFavorites().includes(id);
    }

    toggleFavorite(id) {
      let favs = this.getFavorites();
      if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
      } else {
        favs.unshift(id);
      }
      localStorage.setItem('mz:favorites', JSON.stringify(favs));
      return favs.includes(id);
    }

    /* ── COLLECTIONS ── */
    getCollections() {
      try {
        return JSON.parse(localStorage.getItem('mz:collections') || '[]');
      } catch { return []; }
    }

    createCollection(name) {
      const cols = this.getCollections();
      const col = { id: 'col-' + Date.now(), name, items: [], createdAt: Date.now() };
      cols.push(col);
      localStorage.setItem('mz:collections', JSON.stringify(cols));
      return col;
    }

    updateCollection(id, patch) {
      const cols = this.getCollections();
      const col = cols.find(c => c.id === id);
      if (!col) return null;
      Object.assign(col, patch);
      localStorage.setItem('mz:collections', JSON.stringify(cols));
      return col;
    }

    deleteCollection(id) {
      const cols = this.getCollections().filter(c => c.id !== id);
      localStorage.setItem('mz:collections', JSON.stringify(cols));
    }

    addToCollection(colId, protocolId) {
      const cols = this.getCollections();
      const col = cols.find(c => c.id === colId);
      if (!col) return;
      if (!col.items.includes(protocolId)) col.items.push(protocolId);
      localStorage.setItem('mz:collections', JSON.stringify(cols));
    }

    removeFromCollection(colId, protocolId) {
      const cols = this.getCollections();
      const col = cols.find(c => c.id === colId);
      if (!col) return;
      col.items = col.items.filter(i => i !== protocolId);
      localStorage.setItem('mz:collections', JSON.stringify(cols));
    }

    /* ── USER / TIER ── */
    getUser() {
      try {
        const u = JSON.parse(localStorage.getItem('mz:user') || 'null');
        if (u) return u;
      } catch {}
      return {
        id: null, email: null, name: null,
        tier: 'free_trial',
        trial_days_remaining: 14,
        trial_started: Date.now(),
        plan: null, created_at: Date.now()
      };
    }

    setUser(user) {
      localStorage.setItem('mz:user', JSON.stringify(user));
    }

    isLoggedIn() {
      const u = this.getUser();
      return !!u.id;
    }

    /* ── ONBOARDING / PREFS ── */
    hasOnboarded() {
      return !!localStorage.getItem('mz:onboarded');
    }

    setOnboarded(prefs) {
      localStorage.setItem('mz:onboarded', '1');
      localStorage.setItem('mz:prefs', JSON.stringify(prefs || {}));
    }

    getPrefs() {
      try {
        return JSON.parse(localStorage.getItem('mz:prefs') || '{}');
      } catch { return {}; }
    }

    savePrefs(prefs) {
      const current = this.getPrefs();
      const next = Object.assign({}, current, prefs || {});
      localStorage.setItem('mz:prefs', JSON.stringify(next));
      return next;
    }

    markOnboarded(prefs) {
      localStorage.setItem('mz:onboarded', '1');
      if (prefs) this.savePrefs(prefs);
      return true;
    }

    computeRecommendation(prefs = {}) {
      const protocols = this.getProtocols();
      const goal = String(prefs.goal || 'TRANSITION').toUpperCase();
      const minutes = Number(prefs.time_available_minutes || 20);
      const env = String(prefs.environment || 'moderate').toLowerCase();
      const device = String(prefs.audio_device || 'headphones').toLowerCase();
      const ladder = Number(prefs.silence_ladder_rung || prefs.ladder_rung || 1);

      const byOutcome = protocols.filter(p => String(p.outcome || '').toUpperCase() === goal);
      const pool = byOutcome.length ? byOutcome.slice() : protocols.slice();

      const ranked = pool
        .map(p => {
          let score = 100;
          score -= Math.abs((p.duration_min || 20) - minutes) * 2;

          const density = Number(p.silence_density || 0.6);
          if (env === 'noisy') score -= density > 0.75 ? 18 : 0;
          if (env === 'quiet') score += density > 0.65 ? 6 : 0;
          if (device === 'speakers' && env === 'noisy') score -= density > 0.65 ? 10 : 0;

          // Gate very advanced protocols for low rungs
          if (p.id === 'FUSOKU' && ladder < 5) score -= 40;
          if (p.id === 'YUKI' && ladder < 4) score -= 30;
          if (p.id === 'HI' && minutes < 20) score -= 15;

          // Friendly defaults by goal
          if (goal === 'RESET' && p.id === 'KAZE') score += 12;
          return { p, score };
        })
        .sort((a,b) => b.score - a.score);

      // Goal-specific nudges
      for (const item of ranked) {
        if (goal === 'TRANSITION' && item.p.id === 'KEIRO') item.score += 12;
        if (goal === 'DECOMPRESSION' && item.p.id === 'MIZU') item.score += 6;
        if (goal === 'FOCUS' && item.p.id === (minutes >= 40 ? 'YUKI' : 'SEIJAKU')) item.score += 8;
        if (goal === 'REFLECTION' && item.p.id === (minutes >= 30 ? 'SHINKIRO' : 'TAKE')) item.score += 8;
      }
      ranked.sort((a,b) => b.score - a.score);

      return (ranked[0] && ranked[0].p && ranked[0].p.id) || 'KAZE';
    }

    /* ── SEARCH ── */
    search(query, filters = {}) {
      let protocols = this.getProtocols();
      const q = (query || '').toLowerCase().trim();

      if (q) {
        protocols = protocols.filter(p =>
          p.romanji.toLowerCase().includes(q) ||
          p.title.includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          (p.intent || '').toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.includes(q)) ||
          (p.outcome || '').toLowerCase().includes(q)
        );
      }

      if (filters.season && filters.season !== 'all') {
        protocols = protocols.filter(p => p.season === filters.season);
      }
      if (filters.outcome && filters.outcome !== 'all') {
        protocols = protocols.filter(p => p.outcome === filters.outcome);
      }
      if (filters.duration) {
        if (filters.duration === 'short')  protocols = protocols.filter(p => p.duration_min < 20);
        if (filters.duration === 'medium') protocols = protocols.filter(p => p.duration_min >= 20 && p.duration_min <= 30);
        if (filters.duration === 'long')   protocols = protocols.filter(p => p.duration_min > 30);
      }
      if (filters.density) {
        if (filters.density === 'low')    protocols = protocols.filter(p => p.silence_density < 0.60);
        if (filters.density === 'medium') protocols = protocols.filter(p => p.silence_density >= 0.60 && p.silence_density <= 0.75);
        if (filters.density === 'high')   protocols = protocols.filter(p => p.silence_density > 0.75);
      }
      if (filters.sort) {
        if (filters.sort === 'dur-asc')   protocols.sort((a,b) => a.duration_min - b.duration_min);
        if (filters.sort === 'dur-desc')  protocols.sort((a,b) => b.duration_min - a.duration_min);
        if (filters.sort === 'den-asc')   protocols.sort((a,b) => a.silence_density - b.silence_density);
        if (filters.sort === 'den-desc')  protocols.sort((a,b) => b.silence_density - a.silence_density);
      }
      return protocols;
    }

    /* ── RECENT SEARCHES ── */
    getRecentSearches() {
      try {
        return JSON.parse(localStorage.getItem('mz:recent-searches') || '[]');
      } catch { return []; }
    }

    addRecentSearch(q) {
      if (!q || q.length < 2) return;
      let recent = this.getRecentSearches().filter(r => r !== q);
      recent.unshift(q);
      recent = recent.slice(0, 8);
      localStorage.setItem('mz:recent-searches', JSON.stringify(recent));
    }

    /* ── PINNED ── */
    getPinned() {
      try {
        return JSON.parse(localStorage.getItem('mz:pinned') || '[]');
      } catch { return []; }
    }

    togglePinned(id) {
      let pinned = this.getPinned();
      if (pinned.includes(id)) pinned = pinned.filter(p => p !== id);
      else pinned.unshift(id);
      localStorage.setItem('mz:pinned', JSON.stringify(pinned));
    }
  }

  /* ── EXPOSE GLOBALLY ── */
  const db = new MazenDatabase();
  window.MAZEN_DB = db;   // module 8–12 pages
  window.MazenDB  = db;   // app.html

  /* ── PROTOCOLS (inline array used by app.html's PROTOCOLS var) ── */
  window.PROTOCOLS = PROTOCOL_DATA.reduce((acc, p) => {
    acc[p.id] = {
      id: p.id, name: p.romanji, kanji: p.title, subtitle: p.subtitle,
      outcome: p.outcome, durations: [p.duration_min],
      seasons: [p.season.toUpperCase()],
      whenToUse: p.for || [],
      reflection: p.expected_effect || '',
      defaultSilence: Math.round(p.silence_density * 100),
      silenceDensity: p.silence_density,
      phases: p.phases,
      tags: p.tags,
      intent: p.intent,
      constraints: p.constraints
    };
    return acc;
  }, {});

})(window);
