/* MA-ZEN — admin.js  (Module 17: Admin CMS / Publishing)
   Provides: AdminModule
   Content creation, publishing controls, versioning — localStorage-backed
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  const DRAFTS_KEY  = 'mz:admin-drafts';
  const PUBLISH_KEY = 'mz:admin-published';
  const LOG_KEY     = 'mz:admin-log';

  const ADMIN_CREDENTIALS = { email: 'admin@ma-zen.io', token: 'mz-admin-2025' };

  /* ── STORAGE HELPERS ── */
  function _getDrafts()    { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY)  || '{}'); } catch { return {}; } }
  function _getPublished() { try { return JSON.parse(localStorage.getItem(PUBLISH_KEY) || '{}'); } catch { return {}; } }
  function _getLog()       { try { return JSON.parse(localStorage.getItem(LOG_KEY)     || '[]'); } catch { return []; } }
  function _saveDrafts(d)    { localStorage.setItem(DRAFTS_KEY,  JSON.stringify(d)); }
  function _savePublished(p) { localStorage.setItem(PUBLISH_KEY, JSON.stringify(p)); }
  function _saveLog(l)       { localStorage.setItem(LOG_KEY, JSON.stringify(l)); }

  function _log(action, protocolId, adminId, note) {
    const log = _getLog();
    log.unshift({ action, protocolId, adminId, note: note || '', at: new Date().toISOString() });
    if (log.length > 500) log.length = 500;
    _saveLog(log);
  }

  /* ── AUTH ── */
  function _isAdmin() {
    return localStorage.getItem('mz:admin-session') === ADMIN_CREDENTIALS.token;
  }

  const AdminModule = {

    /* ── ADMIN AUTH ── */
    login(email, token) {
      if (email === ADMIN_CREDENTIALS.email && token === ADMIN_CREDENTIALS.token) {
        localStorage.setItem('mz:admin-session', token);
        return { success: true };
      }
      return { success: false, message: 'Invalid admin credentials.' };
    },

    logout() {
      localStorage.removeItem('mz:admin-session');
    },

    isAdmin() { return _isAdmin(); },

    /* ── DRAFT MANAGEMENT ── */
    createDraft(protocolData) {
      if (!_isAdmin()) return { success: false, message: 'Unauthorized.' };
      const drafts = _getDrafts();
      const id = protocolData.id || 'draft-' + Date.now();
      const draft = {
        ...protocolData,
        id,
        _status:     'draft',
        _version:    1,
        _created_at: new Date().toISOString(),
        _updated_at: new Date().toISOString()
      };
      drafts[id] = draft;
      _saveDrafts(drafts);
      _log('create_draft', id, 'admin');
      return { success: true, draft };
    },

    updateDraft(id, patch) {
      if (!_isAdmin()) return { success: false, message: 'Unauthorized.' };
      const drafts = _getDrafts();
      if (!drafts[id]) return { success: false, message: 'Draft not found.' };
      Object.assign(drafts[id], patch, { _updated_at: new Date().toISOString() });
      _saveDrafts(drafts);
      _log('update_draft', id, 'admin');
      return { success: true, draft: drafts[id] };
    },

    getDraft(id)   { return _getDrafts()[id] || null; },
    getAllDrafts()  { return Object.values(_getDrafts()); },
    deleteDraft(id) {
      if (!_isAdmin()) return;
      const drafts = _getDrafts();
      delete drafts[id];
      _saveDrafts(drafts);
      _log('delete_draft', id, 'admin');
    },

    /* ── PUBLISHING ── */
    publish(id, adminNote) {
      if (!_isAdmin()) return { success: false, message: 'Unauthorized.' };
      const drafts    = _getDrafts();
      const published = _getPublished();
      const draft     = drafts[id];
      if (!draft) return { success: false, message: 'Draft not found.' };

      // QA check before publish
      if (window.QAModule) {
        const result = QAModule.validateProtocol(draft);
        if (!result.passed) {
          return { success: false, message: `QA failed: ${result.errors[0]}`, errors: result.errors };
        }
        QAModule.saveRecord(id, result, 'Auto-check on publish');
      }

      const existing = published[id];
      const version  = (existing?._version || 0) + 1;
      published[id]  = { ...draft, _status: 'published', _version: version, _published_at: new Date().toISOString() };
      _savePublished(published);

      // Update main DB protocols
      if (window.MAZEN_DB && typeof MAZEN_DB._protocols !== 'undefined') {
        const protocols = MAZEN_DB.getProtocols();
        const idx = protocols.findIndex(p => p.id === id);
        if (idx >= 0) protocols[idx] = { ...draft };
        else protocols.push({ ...draft });
      }

      _log('publish', id, 'admin', adminNote);
      return { success: true, protocol: published[id] };
    },

    unpublish(id, reason) {
      if (!_isAdmin()) return { success: false, message: 'Unauthorized.' };
      const published = _getPublished();
      if (!published[id]) return { success: false, message: 'Not found.' };
      published[id]._status = 'unpublished';
      _savePublished(published);
      _log('unpublish', id, 'admin', reason);
      return { success: true };
    },

    getPublished()   { return Object.values(_getPublished()).filter(p => p._status === 'published'); },
    getPublishLog()  { return _getLog(); },

    /* ── RENDER ADMIN DASHBOARD ── */
    renderDashboard(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (!_isAdmin()) {
        this._renderLogin(container);
        return;
      }

      const drafts    = this.getAllDrafts();
      const published = this.getPublished();
      const log       = _getLog().slice(0, 15);

      container.innerHTML = `
        <div class="admin-dash">
          <div class="admin-header">
            <span class="admin-eyebrow">ADMIN CMS</span>
            <h1 class="admin-title">Protocol <em>Publishing</em></h1>
            <div class="admin-header-actions">
              <button class="admin-new-btn" id="admin-new-btn">+ NEW PROTOCOL</button>
              <button class="admin-logout-btn" id="admin-logout-btn">SIGN OUT</button>
            </div>
          </div>

          <div class="admin-stats">
            <div class="admin-stat"><span class="admin-stat-n">${published.length}</span><span class="admin-stat-l">PUBLISHED</span></div>
            <div class="admin-stat"><span class="admin-stat-n">${drafts.length}</span><span class="admin-stat-l">DRAFTS</span></div>
            <div class="admin-stat"><span class="admin-stat-n">${log.length}</span><span class="admin-stat-l">LOG ENTRIES</span></div>
          </div>

          <div class="admin-section">
            <div class="admin-section-label">DRAFTS</div>
            <div class="admin-grid" id="admin-drafts-grid">
              ${drafts.length ? drafts.map(d => this._draftCard(d)).join('') : '<p class="admin-empty">No drafts. Create your first protocol.</p>'}
            </div>
          </div>

          <div class="admin-section">
            <div class="admin-section-label">PUBLISHED PROTOCOLS (${published.length})</div>
            <div class="admin-grid" id="admin-pub-grid">
              ${published.map(p => `
                <div class="admin-pub-card">
                  <span class="admin-card-id">${p.id}</span>
                  <span class="admin-card-name">${p.romanji || p.title}</span>
                  <span class="admin-status-badge published">v${p._version}</span>
                  <button class="admin-unpub-btn btn-sm danger" data-id="${p.id}">UNPUBLISH</button>
                </div>`).join('')}
            </div>
          </div>

          <div class="admin-section">
            <div class="admin-section-label">ACTIVITY LOG</div>
            <div class="admin-log">
              ${log.map(e => `
                <div class="admin-log-entry">
                  <span class="admin-log-action">${e.action.toUpperCase()}</span>
                  <span class="admin-log-proto">${e.protocolId}</span>
                  <span class="admin-log-date">${new Date(e.at).toLocaleString()}</span>
                  ${e.note ? `<span class="admin-log-note">${e.note}</span>` : ''}
                </div>`).join('')}
            </div>
          </div>

          <!-- Draft Editor Modal -->
          <div class="admin-modal" id="admin-editor-modal" style="display:none">
            <div class="admin-modal-inner">
              <div class="admin-modal-header">
                <span id="admin-editor-title">NEW PROTOCOL</span>
                <button class="admin-modal-close" id="admin-editor-close">✕</button>
              </div>
              ${this._editorForm()}
              <div class="admin-editor-actions">
                <button class="admin-save-draft-btn" id="admin-save-draft">SAVE DRAFT</button>
                <button class="admin-publish-btn" id="admin-publish-now">SAVE & PUBLISH</button>
              </div>
              <div class="admin-editor-msg" id="admin-editor-msg"></div>
            </div>
          </div>
        </div>`;

      this._bindDashboard(container);
    },

    _draftCard(d) {
      return `
        <div class="admin-draft-card" data-id="${d.id}">
          <div class="admin-card-top">
            <span class="admin-card-id">${d.id}</span>
            <span class="admin-status-badge draft">DRAFT v${d._version}</span>
          </div>
          <div class="admin-card-name">${d.romanji || d.title || d.id}</div>
          <div class="admin-card-actions">
            <button class="admin-edit-btn btn-sm" data-id="${d.id}">EDIT</button>
            <button class="admin-pub-btn btn-sm" data-id="${d.id}">PUBLISH</button>
            <button class="admin-del-btn btn-sm danger" data-id="${d.id}">DELETE</button>
          </div>
        </div>`;
    },

    _editorForm() {
      return `
        <div class="admin-form">
          <div class="admin-field-row">
            <div class="admin-field"><label>PROTOCOL ID</label><input class="admin-input" id="ef-id" placeholder="e.g. SEIJAKU"></div>
            <div class="admin-field"><label>ROMANJI</label><input class="admin-input" id="ef-romanji" placeholder="e.g. SEIJAKU"></div>
          </div>
          <div class="admin-field-row">
            <div class="admin-field"><label>TITLE (KANJI)</label><input class="admin-input" id="ef-title" placeholder="e.g. 静寂"></div>
            <div class="admin-field"><label>SUBTITLE</label><input class="admin-input" id="ef-subtitle" placeholder="Short descriptor"></div>
          </div>
          <div class="admin-field-row">
            <div class="admin-field"><label>SEASON</label>
              <select class="admin-input" id="ef-season">
                <option>winter</option><option>spring</option><option>summer</option><option>autumn</option><option>experimental</option>
              </select>
            </div>
            <div class="admin-field"><label>OUTCOME</label>
              <select class="admin-input" id="ef-outcome">
                <option>FOCUS</option><option>DECOMPRESSION</option><option>RESET</option><option>TRANSITION</option><option>REFLECTION</option>
              </select>
            </div>
          </div>
          <div class="admin-field-row">
            <div class="admin-field"><label>DURATION (MIN)</label><input class="admin-input" id="ef-duration" type="number" min="5" max="60" placeholder="20"></div>
            <div class="admin-field"><label>SILENCE DENSITY (0–1)</label><input class="admin-input" id="ef-density" type="number" min="0.1" max="1" step="0.01" placeholder="0.72"></div>
          </div>
          <div class="admin-field"><label>INTENT</label><textarea class="admin-textarea" id="ef-intent" rows="2" placeholder="What this protocol is designed to do"></textarea></div>
          <div class="admin-field"><label>FOR (use cases)</label><textarea class="admin-textarea" id="ef-for" rows="2" placeholder="One per line"></textarea></div>
          <div class="admin-field"><label>PHASES (JSON array)</label><textarea class="admin-textarea admin-code" id="ef-phases" rows="6" placeholder='[{"label":"ENTRY","duration_sec":120,"silence_ratio":0.6,"cue":"..."}]'></textarea></div>
          <input type="hidden" id="ef-editing-id">
        </div>`;
    },

    _bindDashboard(container) {
      // Logout
      document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
        this.logout(); this.renderDashboard(container.id);
      });

      // New protocol
      document.getElementById('admin-new-btn')?.addEventListener('click', () => {
        document.getElementById('ef-editing-id').value = '';
        document.getElementById('admin-editor-title').textContent = 'NEW PROTOCOL';
        document.getElementById('admin-editor-modal').style.display = 'flex';
      });

      // Close modal
      document.getElementById('admin-editor-close')?.addEventListener('click', () => {
        document.getElementById('admin-editor-modal').style.display = 'none';
      });

      // Edit draft
      container.querySelectorAll('.admin-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const d = this.getDraft(btn.dataset.id);
          if (!d) return;
          document.getElementById('ef-editing-id').value = d.id;
          document.getElementById('ef-id').value       = d.id;
          document.getElementById('ef-romanji').value  = d.romanji || '';
          document.getElementById('ef-title').value    = d.title || '';
          document.getElementById('ef-subtitle').value = d.subtitle || '';
          document.getElementById('ef-season').value   = d.season || 'winter';
          document.getElementById('ef-outcome').value  = d.outcome || 'FOCUS';
          document.getElementById('ef-duration').value = d.duration_min || '';
          document.getElementById('ef-density').value  = d.silence_density || '';
          document.getElementById('ef-intent').value   = d.intent || '';
          document.getElementById('ef-for').value      = Array.isArray(d.for) ? d.for.join('\n') : (d.for || '');
          document.getElementById('ef-phases').value   = JSON.stringify(d.phases || [], null, 2);
          document.getElementById('admin-editor-title').textContent = `EDIT — ${d.id}`;
          document.getElementById('admin-editor-modal').style.display = 'flex';
        });
      });

      // Save draft
      document.getElementById('admin-save-draft')?.addEventListener('click', () => {
        const data = this._readEditorForm();
        const editingId = document.getElementById('ef-editing-id').value;
        if (editingId) this.updateDraft(editingId, data);
        else this.createDraft(data);
        document.getElementById('admin-editor-modal').style.display = 'none';
        this.renderDashboard(container.id);
      });

      // Publish
      document.getElementById('admin-publish-now')?.addEventListener('click', () => {
        const data = this._readEditorForm();
        const editingId = document.getElementById('ef-editing-id').value;
        const id = editingId || data.id;
        if (!editingId) this.createDraft(data);
        else this.updateDraft(editingId, data);
        const result = this.publish(id);
        const msg = document.getElementById('admin-editor-msg');
        if (result.success) {
          if (msg) msg.textContent = '✓ Published successfully.';
          setTimeout(() => {
            document.getElementById('admin-editor-modal').style.display = 'none';
            this.renderDashboard(container.id);
          }, 800);
        } else {
          if (msg) msg.textContent = result.message;
        }
      });

      // Unpublish
      container.querySelectorAll('.admin-unpub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm(`Unpublish ${btn.dataset.id}?`)) return;
          this.unpublish(btn.dataset.id);
          this.renderDashboard(container.id);
        });
      });

      // Delete draft
      container.querySelectorAll('.admin-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm(`Delete draft ${btn.dataset.id}?`)) return;
          this.deleteDraft(btn.dataset.id);
          this.renderDashboard(container.id);
        });
      });

      // Publish draft
      container.querySelectorAll('.admin-pub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const result = this.publish(btn.dataset.id);
          if (!result.success) alert(result.message);
          this.renderDashboard(container.id);
        });
      });
    },

    _readEditorForm() {
      let phases = [];
      try { phases = JSON.parse(document.getElementById('ef-phases').value || '[]'); } catch {}
      const forText = (document.getElementById('ef-for').value || '').trim();
      return {
        id:              document.getElementById('ef-id').value.trim().toUpperCase(),
        romanji:         document.getElementById('ef-romanji').value.trim().toUpperCase(),
        title:           document.getElementById('ef-title').value.trim(),
        subtitle:        document.getElementById('ef-subtitle').value.trim(),
        season:          document.getElementById('ef-season').value,
        outcome:         document.getElementById('ef-outcome').value,
        duration_min:    parseInt(document.getElementById('ef-duration').value) || 20,
        silence_density: parseFloat(document.getElementById('ef-density').value) || 0.65,
        intent:          document.getElementById('ef-intent').value.trim(),
        for:             forText ? forText.split('\n').map(l => l.trim()).filter(Boolean) : [],
        phases
      };
    },

    _renderLogin(container) {
      container.innerHTML = `
        <div class="admin-login">
          <div class="admin-login-brand">MA-ZEN ADMIN</div>
          <div class="admin-login-form">
            <input class="admin-input" id="admin-email" type="email" placeholder="admin@ma-zen.io">
            <input class="admin-input" id="admin-token" type="password" placeholder="Admin token">
            <button class="admin-login-btn" id="admin-login-submit">ENTER</button>
            <div class="admin-login-msg" id="admin-login-msg"></div>
          </div>
        </div>`;
      document.getElementById('admin-login-submit').addEventListener('click', () => {
        const email = document.getElementById('admin-email').value;
        const token = document.getElementById('admin-token').value;
        const result = this.login(email, token);
        if (result.success) this.renderDashboard(container.id);
        else document.getElementById('admin-login-msg').textContent = result.message;
      });
    }
  };

  window.AdminModule = AdminModule;
})(window);
