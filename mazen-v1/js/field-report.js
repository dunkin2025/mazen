/* MA-ZEN — field-report.js  (Module 15: Field Report / Post-Session)
   Provides: FieldReportModule
   Non-clinical post-session check-in: neutral sliders, optional notes, export
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  /* ── SLIDER DEFINITIONS (neutral — not therapeutic) ── */
  const SLIDERS = [
    { id: 'clarity',    label: 'Mental clarity',    left: 'Clouded',   right: 'Clear',   default: 3 },
    { id: 'present',    label: 'Presence',          left: 'Distant',   right: 'Present', default: 3 },
    { id: 'activation', label: 'Activation level',  left: 'Low',       right: 'High',    default: 3 },
    { id: 'readiness',  label: 'Readiness to act',  left: 'Not ready', right: 'Ready',   default: 3 },
    { id: 'density',    label: 'Silence felt like',  left: 'Too dense', right: 'Too sparse', default: 3 }
  ];

  const KEY = 'mz:field-reports';

  /* ── STORAGE ── */
  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  function _save(reports) {
    localStorage.setItem(KEY, JSON.stringify(reports));
  }

  const FieldReportModule = {

    /* ── SAVE A REPORT ── */
    saveReport(sessionId, protocolId, values, notes) {
      const reports = _load();
      const report = {
        id:         'fr-' + Date.now(),
        session_id: sessionId,
        protocol_id:protocolId,
        values:     values || {},
        notes:      (notes || '').slice(0, 500),
        created_at: new Date().toISOString()
      };
      reports.unshift(report);
      if (reports.length > 200) reports.length = 200;
      _save(reports);

      // Update LadderModule with session completion
      if (window.LadderModule && protocolId) {
        const db = window.MAZEN_DB;
        if (db) {
          const p = db.getProtocolById(protocolId);
          LadderModule.recordSession(protocolId, p ? p.silence_density : 0.6);
        }
      }

      return report;
    },

    getReports() { return _load(); },

    getReportBySession(sessionId) {
      return _load().find(r => r.session_id === sessionId) || null;
    },

    /* ── RENDER INLINE CHECK-IN (post-player modal) ── */
    renderCheckIn(containerId, sessionId, protocolId, onDone) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = `
        <div class="fr-wrap" id="fr-inner">
          <div class="fr-header">
            <span class="fr-eyebrow">FIELD REPORT</span>
            <h2 class="fr-title">How did it <em>land</em>?</h2>
            <p class="fr-sub">Optional. 30 seconds. Your responses are private.</p>
          </div>

          <div class="fr-sliders" id="fr-sliders">
            ${SLIDERS.map(s => `
              <div class="fr-slider-row">
                <div class="fr-slider-meta">
                  <span class="fr-slider-label">${s.label}</span>
                  <span class="fr-slider-val" id="fr-val-${s.id}">3</span>
                </div>
                <div class="fr-slider-extremes">
                  <span class="fr-extreme-left">${s.left}</span>
                  <input type="range" class="fr-range" id="fr-${s.id}"
                         min="1" max="5" value="${s.default}"
                         data-key="${s.id}">
                  <span class="fr-extreme-right">${s.right}</span>
                </div>
              </div>`).join('')}
          </div>

          <div class="fr-notes-block">
            <label class="fr-notes-label" for="fr-notes">NOTES <span class="fr-optional">(optional)</span></label>
            <textarea class="fr-notes" id="fr-notes" maxlength="500"
              placeholder="What happened. What changed. What you noticed. Or nothing."></textarea>
            <div class="fr-char-count"><span id="fr-char">0</span>/500</div>
          </div>

          <div class="fr-actions">
            <button class="fr-save-btn" id="fr-save"><span>SAVE REPORT</span></button>
            <button class="fr-skip-btn" id="fr-skip">SKIP</button>
          </div>
        </div>`;

      // Live slider value display
      container.querySelectorAll('.fr-range').forEach(input => {
        const update = () => {
          const valEl = document.getElementById(`fr-val-${input.dataset.key}`);
          if (valEl) valEl.textContent = input.value;
        };
        input.addEventListener('input', update);
      });

      // Char count
      const notesEl = container.querySelector('#fr-notes');
      notesEl.addEventListener('input', () => {
        container.querySelector('#fr-char').textContent = notesEl.value.length;
      });

      // Save
      container.querySelector('#fr-save').addEventListener('click', () => {
        const values = {};
        SLIDERS.forEach(s => {
          const el = container.querySelector(`#fr-${s.id}`);
          if (el) values[s.id] = parseInt(el.value);
        });
        const notes = notesEl.value.trim();
        const report = this.saveReport(sessionId, protocolId, values, notes);
        if (onDone) onDone(report);
      });

      container.querySelector('#fr-skip').addEventListener('click', () => {
        if (onDone) onDone(null);
      });
    },

    /* ── RENDER HISTORY LOG ── */
    renderLog(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const reports = _load();

      if (!reports.length) {
        container.innerHTML = `<div class="fr-empty"><div class="fr-empty-glyph">◎</div><p>No field reports yet. They appear after sessions.</p></div>`;
        return;
      }

      container.innerHTML = `
        <div class="fr-log">
          <div class="fr-log-header">
            <span class="fr-log-label">FIELD REPORT LOG</span>
            <button class="fr-export-btn" id="fr-export-btn">EXPORT CSV</button>
          </div>
          <div class="fr-log-entries">
            ${reports.slice(0, 30).map(r => {
              const date = new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' });
              const avgVal = Object.values(r.values || {}).reduce((a,b) => a + b, 0) / (Object.keys(r.values || {}).length || 1);
              return `
                <div class="fr-log-entry">
                  <div class="fr-log-top">
                    <span class="fr-log-proto">${r.protocol_id || '—'}</span>
                    <span class="fr-log-date">${date}</span>
                    <span class="fr-log-avg">${avgVal.toFixed(1)}/5 avg</span>
                  </div>
                  ${r.notes ? `<div class="fr-log-note">${r.notes.slice(0, 120)}${r.notes.length > 120 ? '…' : ''}</div>` : ''}
                  <div class="fr-log-bars">
                    ${Object.entries(r.values || {}).map(([k, v]) => `
                      <div class="fr-log-bar-item">
                        <span class="fr-log-bar-lbl">${k}</span>
                        <div class="fr-log-bar-track">
                          <div class="fr-log-bar-fill" style="width:${(v/5)*100}%"></div>
                        </div>
                      </div>`).join('')}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;

      document.getElementById('fr-export-btn')?.addEventListener('click', () => {
        this.exportCSV();
      });
    },

    /* ── EXPORT CSV ── */
    exportCSV() {
      const reports = _load();
      if (!reports.length) return;

      const headers = ['date', 'protocol', 'notes', ...SLIDERS.map(s => s.id)];
      const rows = reports.map(r => [
        new Date(r.created_at).toISOString().slice(0, 10),
        r.protocol_id || '',
        (r.notes || '').replace(/,/g, ';'),
        ...SLIDERS.map(s => r.values?.[s.id] || '')
      ]);

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `mazen-field-reports-${Date.now()}.csv`;
      a.click(); URL.revokeObjectURL(url);
    }
  };

  window.FieldReportModule = FieldReportModule;
})(window);
