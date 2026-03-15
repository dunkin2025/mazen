/* MA-ZEN — personalization.js  (Module 13: Lightweight Personalization)
   Provides: PersonalizationModule
   Recommendation engine — history-aware, rotation-safe, non-algorithmic vibe
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  /* ── SURFACE CONTEXTS ── */
  const SURFACES = ['home', 'library', 'post_session'];

  /* ── ROTATION MEMORY: avoid repeating same rec within N sessions ── */
  const ROTATION_WINDOW = 3;

  /* ── RECOMMENDATION RULES (goal × env × time → protocol) ── */
  const REC_MATRIX = [
    { goal: 'FOCUS',         env: ['quiet','moderate'], minTime: 20, id: 'SEIJAKU', label: 'For deep work' },
    { goal: 'FOCUS',         env: ['quiet'],            minTime: 30, id: 'MIYABI',  label: 'For sustained precision' },
    { goal: 'FOCUS',         env: ['any'],              minTime: 10, id: 'KAZE',    label: 'Entry — anytime focus' },
    { goal: 'DECOMPRESSION', env: ['any'],              minTime: 20, id: 'GAKE',    label: 'After intensity' },
    { goal: 'DECOMPRESSION', env: ['any'],              minTime: 10, id: 'AKANE',   label: 'Midday reset' },
    { goal: 'DECOMPRESSION', env: ['any'],              minTime: 25, id: 'MIZU',    label: 'End of day release' },
    { goal: 'RESET',         env: ['any'],              minTime: 25, id: 'HI',      label: 'Complete clearing' },
    { goal: 'RESET',         env: ['any'],              minTime: 10, id: 'AKANE',   label: 'Quick reset' },
    { goal: 'TRANSITION',    env: ['any'],              minTime: 15, id: 'KAZE',    label: 'Move between modes' },
    { goal: 'TRANSITION',    env: ['any'],              minTime: 30, id: 'KEIRO',   label: 'Navigate uncertainty' },
    { goal: 'REFLECTION',    env: ['quiet'],            minTime: 20, id: 'SHINKIRO',label: 'Integration' },
    { goal: 'REFLECTION',    env: ['any'],              minTime: 20, id: 'TAKE',    label: 'Morning reflection' },
  ];

  /* ── TIME-OF-DAY SUGGESTIONS ── */
  function _timeContext() {
    const h = new Date().getHours();
    if (h >= 5  && h < 9)  return { label: 'For this morning', priority: ['TAKE','KAZE','MIYABI'] };
    if (h >= 9  && h < 12) return { label: 'For focus now',    priority: ['SEIJAKU','MIYABI','KANSEI'] };
    if (h >= 12 && h < 14) return { label: 'Midday reset',     priority: ['AKANE','NATSUKAGE','KAZE'] };
    if (h >= 14 && h < 17) return { label: 'Afternoon depth',  priority: ['SEIJAKU','GAKE','KEIRO'] };
    if (h >= 17 && h < 20) return { label: 'For this evening', priority: ['GAKE','MIZU','OCHIBA'] };
    return                         { label: 'For tonight',      priority: ['FUYUGARE','MIZU','OCHIBA'] };
  }

  /* ── LADDER NEXT STEP ── */
  function _ladderNext(sessions) {
    const db = window.MAZEN_DB;
    const completed = sessions.filter(s => s.completed).length;
    if (completed < 3)  return { id: 'KAZE',    label: 'Your next step on the Ladder' };
    if (completed < 8)  return { id: 'SEIJAKU', label: 'Ready for deeper silence' };
    if (completed < 15) return { id: 'MIYABI',  label: 'Next Ladder rung' };
    if (completed < 25) return { id: 'GAKE',    label: 'Rung 3 — pushing density' };
    if (completed < 40) return { id: 'SHINKIRO',label: 'Advanced practice awaits' };
    return                     { id: 'FUSOKU',  label: 'The final practice' };
  }

  /* ── ROTATION CHECK: skip if used in last N sessions ── */
  function _notRecentlyUsed(id, sessions) {
    const recent = sessions.slice(0, ROTATION_WINDOW).map(s => s.protocolId);
    return !recent.includes(id);
  }

  const PersonalizationModule = {

    /* ── PRIMARY: get recommendations for a surface ── */
    getRecommendations(surface = 'home', limit = 3) {
      const db    = window.MAZEN_DB;
      const prefs = db.getPrefs();
      const sessions = db.getSessions();
      const goal  = (prefs.goal || 'FOCUS').toUpperCase();
      const env   = prefs.environment || 'quiet';
      const time  = prefs.time_available_minutes || 20;
      const protocols = db.getProtocols();

      const recs = [];

      // 1. Time-of-day contextual rec
      const tod = _timeContext();
      for (const id of tod.priority) {
        const p = protocols.find(p => p.id === id || p.romanji === id);
        if (p && _notRecentlyUsed(p.id, sessions)) {
          recs.push({ protocol: p, label: tod.label, source: 'time_of_day', weight: 10 });
          break;
        }
      }

      // 2. Goal + env match
      const matched = REC_MATRIX
        .filter(r => r.goal === goal && r.minTime <= time)
        .filter(r => r.env.includes('any') || r.env.includes(env));

      for (const rule of matched) {
        if (recs.length >= limit) break;
        const p = protocols.find(p => p.id === rule.id || p.romanji === rule.id);
        if (p && _notRecentlyUsed(p.id, sessions) && !recs.find(r => r.protocol.id === p.id)) {
          recs.push({ protocol: p, label: rule.label, source: 'goal_match', weight: 8 });
        }
      }

      // 3. Ladder next step
      if (recs.length < limit) {
        const next = _ladderNext(sessions);
        const p = protocols.find(p => p.id === next.id || p.romanji === next.id);
        if (p && !recs.find(r => r.protocol.id === p.id)) {
          recs.push({ protocol: p, label: next.label, source: 'ladder', weight: 6 });
        }
      }

      // 4. Fallback: favorites not recently used
      if (recs.length < limit) {
        const favs = db.getFavorites();
        for (const fid of favs) {
          if (recs.length >= limit) break;
          const p = protocols.find(p => p.id === fid);
          if (p && _notRecentlyUsed(p.id, sessions) && !recs.find(r => r.protocol.id === p.id)) {
            recs.push({ protocol: p, label: 'From your saved protocols', source: 'favorite', weight: 4 });
          }
        }
      }

      // 5. Final fallback: KAZE
      if (recs.length === 0) {
        const p = protocols.find(p => p.id === 'KAZE');
        if (p) recs.push({ protocol: p, label: 'Begin here', source: 'fallback', weight: 1 });
      }

      return recs.slice(0, limit);
    },

    /* ── RENDER: inject recommendation strip into a container ── */
    renderStrip(containerId, opts = {}) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const { surface = 'home', limit = 3, title = 'RECOMMENDED' } = opts;
      const recs = this.getRecommendations(surface, limit);
      if (!recs.length) { container.style.display = 'none'; return; }

      container.innerHTML = `
        <div class="rec-strip">
          <div class="rec-strip-header">
            <span class="rec-label">${title}</span>
          </div>
          <div class="rec-cards">
            ${recs.map(r => `
              <div class="rec-card" data-id="${r.protocol.id}" data-slug="${r.protocol.slug || r.protocol.id.toLowerCase()}" tabindex="0" role="button">
                <span class="rec-card-label">${r.label}</span>
                <div class="rec-card-kanji">${r.protocol.title || r.protocol.kanji || ''}</div>
                <div class="rec-card-name">${r.protocol.romanji || r.protocol.name || r.protocol.id}</div>
                <div class="rec-card-dur">${r.protocol.duration_min || ''}m · ${Math.round((r.protocol.silence_density || 0.6) * 100)}% silence</div>
                <div class="rec-card-arrow">→</div>
              </div>`).join('')}
          </div>
        </div>`;

      container.querySelectorAll('.rec-card').forEach(card => {
        const handler = () => {
          const slug = card.dataset.slug;
          const id   = card.dataset.id;
          window.location.href = `protocol.html?id=${id}`;
        };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
      });
    },

    /* ── POST-SESSION: "what to do next" ── */
    getPostSessionRec(completedProtocolId) {
      const db = window.MAZEN_DB;
      const sessions = db.getSessions();
      const protocols = db.getProtocols();

      // After completion, suggest ladder next step
      const next = _ladderNext(sessions);
      const p = protocols.find(p => p.id === next.id || p.romanji === next.id);
      if (p) return { protocol: p, label: next.label };

      // Fallback: different protocol from same outcome
      const completed = protocols.find(p => p.id === completedProtocolId);
      if (completed) {
        const sameOutcome = protocols.filter(p => p.outcome === completed.outcome && p.id !== completedProtocolId);
        if (sameOutcome.length) return { protocol: sameOutcome[0], label: 'Same intention, different form' };
      }
      return null;
    }
  };

  window.PersonalizationModule = PersonalizationModule;
})(window);
