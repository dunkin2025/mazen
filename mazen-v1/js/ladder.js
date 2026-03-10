/* MA-ZEN — ladder.js  (Module 14: Silence Density Ladder)
   Provides: LadderModule
   Progression system: 6 rungs, density thresholds, protocol mapping
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  /* ── LADDER DEFINITION ── */
  const LADDER = [
    {
      rung: 1,
      name: 'PRESENCE',
      kanji: '在',
      density_range: [0.40, 0.60],
      density_label: 'LOW — 40–60%',
      sessions_required: 3,
      description: 'You arrive. Acoustic material is present; silence is the frame. Learn what a governed session feels like.',
      unlock_message: 'The frame is visible. You are ready for more silence.',
      protocols: ['KAZE', 'KOMOREBI', 'TAKE'],
      color: 'var(--outcome-transition)'
    },
    {
      rung: 2,
      name: 'STILLNESS',
      kanji: '静',
      density_range: [0.55, 0.70],
      density_label: 'MEDIUM — 55–70%',
      sessions_required: 3,
      description: 'The silence begins to have weight. Events become rare enough to matter.',
      unlock_message: 'Stillness is no longer absence. You are inside it.',
      protocols: ['SEIJAKU', 'AKANE', 'GAKE', 'HAZAKURA'],
      color: 'var(--outcome-focus)'
    },
    {
      rung: 3,
      name: 'DEPTH',
      kanji: '深',
      density_range: [0.60, 0.75],
      density_label: 'MEDIUM-HIGH — 60–75%',
      sessions_required: 5,
      description: 'Each event carries more meaning precisely because it arrives less often.',
      unlock_message: 'You are no longer waiting for the sound. You are working with what is not there.',
      protocols: ['MIYABI', 'MIZU', 'KEIRO', 'NATSUKAGE'],
      color: 'var(--outcome-decomp)'
    },
    {
      rung: 4,
      name: 'DISSOLUTION',
      kanji: '溶',
      density_range: [0.70, 0.85],
      density_label: 'HIGH — 70–85%',
      sessions_required: 5,
      description: 'The self becomes less distinct from the silence. Cognitive separation from environmental noise.',
      unlock_message: 'What dissolves is not you. It is the noise you carried in.',
      protocols: ['KANSEI', 'HI', 'OCHIBA', 'YUKI'],
      color: 'var(--outcome-reset)'
    },
    {
      rung: 5,
      name: 'INTEGRATION',
      kanji: '統',
      density_range: [0.80, 0.92],
      density_label: 'EXTREME — 80–92%',
      sessions_required: 5,
      description: 'Near-pure silence with rare, precise events. The practitioner provides the structure.',
      unlock_message: 'The silence is not empty. You have learned to read it.',
      protocols: ['SHINKIRO', 'FUYUGARE', 'MA'],
      color: 'var(--outcome-reflection)'
    },
    {
      rung: 6,
      name: 'VOID',
      kanji: '無',
      density_range: [0.88, 1.00],
      density_label: 'MAXIMUM — 88–100%',
      sessions_required: 0, // No advancement beyond — final rung
      description: 'FUSOKU only. Near-absolute silence as practice. Variable outcomes; document what occurs.',
      unlock_message: 'There is nowhere further to go. This is it.',
      protocols: ['FUSOKU'],
      color: 'rgba(196,148,74,0.5)'
    }
  ];

  /* ── STORAGE KEY ── */
  const KEY = 'mz:ladder';

  const LadderModule = {

    /* ── LOAD / SAVE STATE ── */
    getState() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || 'null') || this._defaultState();
      } catch { return this._defaultState(); }
    },

    _defaultState() {
      return {
        current_rung: 1,
        rung_sessions: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 },
        unlocked_rungs: [1],
        total_sessions: 0,
        history: []
      };
    },

    saveState(state) {
      localStorage.setItem(KEY, JSON.stringify(state));
    },

    /* ── RECORD COMPLETED SESSION ── */
    recordSession(protocolId, silenceDensity) {
      const state = this.getState();
      const rung  = state.current_rung;

      state.rung_sessions[rung] = (state.rung_sessions[rung] || 0) + 1;
      state.total_sessions++;
      state.history.unshift({ protocolId, silenceDensity, rung, at: Date.now() });
      if (state.history.length > 100) state.history = state.history.slice(0, 100);

      const def = LADDER[rung - 1];
      let advanced = false;
      if (def.sessions_required > 0 && state.rung_sessions[rung] >= def.sessions_required && rung < 6) {
        const nextRung = rung + 1;
        state.current_rung = nextRung;
        if (!state.unlocked_rungs.includes(nextRung)) state.unlocked_rungs.push(nextRung);
        advanced = true;
      }

      this.saveState(state);
      return { advanced, new_rung: state.current_rung, state };
    },

    /* ── GET RUNG DEFINITIONS ── */
    getRung(n) { return LADDER[n - 1] || LADDER[0]; },
    getAllRungs() { return LADDER; },

    /* ── PROTOCOL → RUNG MAPPING ── */
    getProtocolRung(protocolId) {
      for (const rung of LADDER) {
        if (rung.protocols.includes(protocolId)) return rung.rung;
      }
      return 1;
    },

    /* ── ACCESS CHECK ── */
    canAccess(rungNumber) {
      const state = this.getState();
      return state.unlocked_rungs.includes(rungNumber);
    },

    /* ── PROGRESS FOR CURRENT RUNG ── */
    getProgress() {
      const state  = this.getState();
      const rung   = state.current_rung;
      const def    = LADDER[rung - 1];
      const done   = state.rung_sessions[rung] || 0;
      const needed = def.sessions_required || 1;
      return {
        rung, done, needed,
        pct: Math.min(100, Math.round((done / needed) * 100)),
        sessions_to_next: Math.max(0, needed - done),
        is_final: rung === 6
      };
    },

    /* ── RENDER FULL LADDER PAGE ── */
    renderPage(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const state = this.getState();
      const progress = this.getProgress();

      container.innerHTML = `
        <div class="ladder-page">
          <div class="ladder-header">
            <span class="ladder-eyebrow">SILENCE DENSITY LADDER</span>
            <h1 class="ladder-title">六段<em>の</em>静寂</h1>
            <p class="ladder-sub">Six rungs. Each deepens the silence ratio. Progression is earned, not chosen.</p>
          </div>

          <div class="ladder-progress-bar-wrap">
            <div class="ladder-overall-label">RUNG ${state.current_rung} OF 6 — ${LADDER[state.current_rung-1].name}</div>
            <div class="ladder-overall-track">
              <div class="ladder-overall-fill" style="width:${((state.current_rung-1)/5)*100}%"></div>
            </div>
          </div>

          <div class="ladder-rungs">
            ${LADDER.map(rung => {
              const isUnlocked  = state.unlocked_rungs.includes(rung.rung);
              const isCurrent   = rung.rung === state.current_rung;
              const isCompleted = rung.rung < state.current_rung;
              const sessionsDone = state.rung_sessions[rung.rung] || 0;
              const pct = rung.sessions_required > 0
                ? Math.min(100, Math.round((sessionsDone / rung.sessions_required) * 100))
                : 100;

              return `
                <div class="ladder-rung ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}">
                  <div class="ladder-rung-left">
                    <div class="ladder-rung-num" style="color:${rung.color}">${rung.rung}</div>
                    <div class="ladder-rung-line" style="background:${isCompleted ? rung.color : 'var(--border)'}"></div>
                  </div>
                  <div class="ladder-rung-body">
                    <div class="ladder-rung-top">
                      <div class="ladder-rung-kanji" style="color:${isUnlocked ? rung.color : 'var(--type-faint)'}">${rung.kanji}</div>
                      <div class="ladder-rung-meta">
                        <span class="ladder-rung-name">${rung.name}</span>
                        <span class="ladder-density-tag">${rung.density_label}</span>
                      </div>
                      ${isCompleted ? '<span class="ladder-check">✓</span>' : ''}
                      ${!isUnlocked ? '<span class="ladder-lock">⌒</span>' : ''}
                    </div>
                    <p class="ladder-rung-desc">${isUnlocked ? rung.description : 'Complete previous rung to unlock.'}</p>
                    ${isUnlocked && !isCompleted && rung.sessions_required > 0 ? `
                      <div class="ladder-rung-progress">
                        <div class="ladder-rung-track">
                          <div class="ladder-rung-fill" style="width:${pct}%;background:${rung.color}"></div>
                        </div>
                        <span class="ladder-rung-count">${sessionsDone} / ${rung.sessions_required} sessions</span>
                      </div>` : ''}
                    ${isUnlocked ? `
                      <div class="ladder-rung-protocols">
                        ${rung.protocols.map(id => `<span class="ladder-proto-tag">${id}</span>`).join('')}
                      </div>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>

          <div class="ladder-edu-block">
            <div class="ladder-edu-label">WHY DENSITY INCREASES</div>
            <p class="ladder-edu-body">Acoustic density is the ratio of silence to sound event. At low density, events are frequent anchors — useful, but they do the cognitive work for you. As density increases, you learn to provide the structure yourself. The silence becomes the practice, not the absence of it.</p>
          </div>
        </div>`;
    },

    /* ── RENDER COMPACT LADDER WIDGET (for sidebars) ── */
    renderWidget(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const progress = this.getProgress();
      const rungDef  = this.getRung(progress.rung);

      container.innerHTML = `
        <div class="ladder-widget">
          <div class="ladder-widget-label">SILENCE LADDER</div>
          <div class="ladder-widget-rung">
            <span class="ladder-widget-kanji">${rungDef.kanji}</span>
            <div class="ladder-widget-info">
              <span class="ladder-widget-name">Rung ${progress.rung} — ${rungDef.name}</span>
              <span class="ladder-widget-density">${rungDef.density_label}</span>
            </div>
          </div>
          ${!progress.is_final ? `
            <div class="ladder-widget-progress">
              <div class="ladder-widget-track">
                <div class="ladder-widget-fill" style="width:${progress.pct}%"></div>
              </div>
              <span class="ladder-widget-count">${progress.done}/${progress.needed} sessions to advance</span>
            </div>` : `<div class="ladder-widget-final">Final rung reached.</div>`}
          <a href="ladder.html" class="ladder-widget-link">VIEW FULL LADDER →</a>
        </div>`;
    }
  };

  window.LadderModule = LadderModule;
})(window);
