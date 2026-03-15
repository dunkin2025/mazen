/* MA-ZEN — qa.js  (Module 16: Quality + Governance)
   Provides: QAModule
   Protocol QA checklist, audio rule validation, publish readiness
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  /* ── QA RULES ── */
  const REQUIRED_PHASE_COUNT   = 3;
  const MIN_SILENCE_DENSITY    = 0.30;
  const MAX_SILENCE_DENSITY    = 1.00;
  const REQUIRED_FIELDS        = ['id', 'title', 'romanji', 'season', 'duration_min', 'silence_density', 'intent', 'phases'];
  const REQUIRED_PHASE_FIELDS  = ['label', 'duration_sec', 'silence_ratio', 'cue'];
  const MIN_PHASE_CUE_LENGTH   = 5;
  const MIN_TOTAL_DURATION_SEC = 300; // 5 min minimum

  const KEY = 'mz:qa-records';

  /* ── STORAGE ── */
  function _loadRecords() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function _saveRecords(r) { localStorage.setItem(KEY, JSON.stringify(r)); }

  const QAModule = {

    /* ── RUN QA ON A PROTOCOL ── */
    validateProtocol(protocol) {
      const errors   = [];
      const warnings = [];

      // 1. Required metadata fields
      for (const field of REQUIRED_FIELDS) {
        if (!protocol[field]) errors.push(`Missing required field: ${field}`);
      }

      // 2. Silence density bounds
      const sd = parseFloat(protocol.silence_density || 0);
      if (sd < MIN_SILENCE_DENSITY) errors.push(`silence_density ${sd} below minimum (${MIN_SILENCE_DENSITY})`);
      if (sd > MAX_SILENCE_DENSITY) errors.push(`silence_density ${sd} exceeds maximum (1.0)`);

      // 3. Phases
      const phases = protocol.phases || [];
      if (phases.length < REQUIRED_PHASE_COUNT) {
        errors.push(`Minimum ${REQUIRED_PHASE_COUNT} phases required — found ${phases.length}`);
      }

      let totalDuration = 0;
      phases.forEach((ph, i) => {
        for (const f of REQUIRED_PHASE_FIELDS) {
          if (ph[f] === undefined || ph[f] === null) errors.push(`Phase ${i+1}: missing ${f}`);
        }
        if (ph.cue && ph.cue.length < MIN_PHASE_CUE_LENGTH) {
          warnings.push(`Phase ${i+1} (${ph.label}): cue too short — "${ph.cue}"`);
        }
        if (ph.silence_ratio < 0 || ph.silence_ratio > 1) {
          errors.push(`Phase ${i+1}: silence_ratio must be 0–1`);
        }
        totalDuration += (ph.duration_sec || 0);
      });

      // 4. Total duration
      if (totalDuration > 0 && totalDuration < MIN_TOTAL_DURATION_SEC) {
        errors.push(`Total phase duration ${totalDuration}s below minimum ${MIN_TOTAL_DURATION_SEC}s`);
      }

      // 5. Optional recommendations
      if (!protocol.subtitle)      warnings.push('No subtitle — adds context in library');
      if (!protocol.for)           warnings.push('No "for" use cases specified');
      if (!protocol.not_for)       warnings.push('No "not_for" contraindications');
      if (!protocol.expected_effect) warnings.push('No expected_effect description');
      if (!protocol.setup_notes)   warnings.push('No setup_notes');

      const passed = errors.length === 0;
      return { passed, errors, warnings, protocol_id: protocol.id };
    },

    /* ── SAVE QA RECORD ── */
    saveRecord(protocolId, result, adminNote) {
      const records = _loadRecords();
      records[protocolId] = records[protocolId] || { history: [] };
      const entry = {
        id:       'qa-' + Date.now(),
        status:   result.passed ? 'approved' : 'rejected',
        errors:   result.errors,
        warnings: result.warnings,
        note:     adminNote || '',
        at:       new Date().toISOString(),
        version:  (records[protocolId].history.length + 1)
      };
      records[protocolId].latest = entry;
      records[protocolId].history.unshift(entry);
      if (records[protocolId].history.length > 20) records[protocolId].history.length = 20;
      _saveRecords(records);
      return entry;
    },

    getRecord(protocolId) {
      return _loadRecords()[protocolId] || null;
    },

    getAllRecords() { return _loadRecords(); },

    /* ── CHECK PUBLISH READINESS ── */
    isPublishReady(protocolId) {
      const rec = this.getRecord(protocolId);
      return rec && rec.latest && rec.latest.status === 'approved';
    },

    /* ── RENDER QA PANEL (for admin) ── */
    renderPanel(containerId, protocols) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const records = _loadRecords();

      container.innerHTML = `
        <div class="qa-panel">
          <div class="qa-panel-header">
            <span class="qa-eyebrow">QUALITY + GOVERNANCE</span>
            <h2 class="qa-title">Protocol <em>Validation</em></h2>
            <p class="qa-sub">Run QA checks against all protocols. Catch errors before publishing.</p>
          </div>

          <div class="qa-run-all">
            <button class="qa-run-btn" id="qa-run-all">RUN ALL CHECKS</button>
            <span class="qa-summary" id="qa-summary"></span>
          </div>

          <div class="qa-grid" id="qa-grid">
            ${protocols.map(p => {
              const rec   = records[p.id];
              const status = rec?.latest?.status || 'unchecked';
              return `
                <div class="qa-card" data-id="${p.id}">
                  <div class="qa-card-top">
                    <span class="qa-card-id">${p.id}</span>
                    <span class="qa-status qa-status-${status}">${status.toUpperCase()}</span>
                  </div>
                  <div class="qa-card-name">${p.romanji || p.title || p.id}</div>
                  <div class="qa-card-actions">
                    <button class="qa-check-btn btn-sm" data-id="${p.id}">CHECK</button>
                    ${status === 'approved' ? `<button class="qa-reject-btn btn-sm danger" data-id="${p.id}">REJECT</button>` : ''}
                    ${status === 'rejected' ? `<button class="qa-approve-btn btn-sm" data-id="${p.id}">APPROVE</button>` : ''}
                  </div>
                  <div class="qa-results" id="qa-results-${p.id}" style="display:none"></div>
                </div>`;
            }).join('')}
          </div>
        </div>`;

      // Run all
      document.getElementById('qa-run-all').addEventListener('click', () => {
        let passed = 0, failed = 0;
        protocols.forEach(p => {
          const result = this.validateProtocol(p);
          this.saveRecord(p.id, result, 'Auto-check');
          this._showResults(p.id, result, container);
          result.passed ? passed++ : failed++;
        });
        const summary = document.getElementById('qa-summary');
        if (summary) summary.textContent = `${passed} passed · ${failed} failed`;
        // Refresh card status badges
        protocols.forEach(p => {
          const card = container.querySelector(`.qa-card[data-id="${p.id}"]`);
          const rec  = this.getRecord(p.id);
          if (card && rec?.latest) {
            const badge = card.querySelector('.qa-status');
            if (badge) { badge.className = `qa-status qa-status-${rec.latest.status}`; badge.textContent = rec.latest.status.toUpperCase(); }
          }
        });
      });

      // Individual check buttons
      container.querySelectorAll('.qa-check-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = protocols.find(p => p.id === btn.dataset.id);
          if (!p) return;
          const result = this.validateProtocol(p);
          this.saveRecord(p.id, result, '');
          this._showResults(p.id, result, container);
        });
      });
    },

    _showResults(protocolId, result, container) {
      const el = document.getElementById(`qa-results-${protocolId}`);
      if (!el) return;
      el.style.display = 'block';
      el.innerHTML = `
        <div class="qa-result ${result.passed ? 'pass' : 'fail'}">
          <div class="qa-result-status">${result.passed ? '✓ PASS' : `✗ ${result.errors.length} ERROR${result.errors.length > 1 ? 'S' : ''}`}</div>
          ${result.errors.map(e => `<div class="qa-error">✗ ${e}</div>`).join('')}
          ${result.warnings.map(w => `<div class="qa-warn">⚠ ${w}</div>`).join('')}
        </div>`;
    }
  };

  window.QAModule = QAModule;
})(window);
