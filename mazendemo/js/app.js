/**
 * App.js — MA-ZEN Application Controller
 * Bootstraps the module graph and provides UI utilities.
 */

class MaZenApp {
  constructor() {
    this.practitioner = new Practitioner();
    this.library      = new ProtocolLibrary();
    this.access       = new AccessProtocol(this.practitioner);
    this.membership   = new MembershipService(this.practitioner);
    this.engine       = SilenceEngine.getInstance();
    this.cms          = new StudioCMS();

    this._currentLog  = null;
    this._activeSession = null;

    this._initPlayerBar();
    this._initToasts();
    this._bindNavState();
  }

  async init() {
    await this.library.load();
    if (this.practitioner.isAuthenticated) {
      this._currentLog = new SessionLog(this.practitioner.id);
    }
    this._updateNavTier();
    return this;
  }

  // ─── Session Management ───────────────────────────────────────

  async enterProtocol(protocol) {
    const check = this.access.enforce(protocol);
    if (!check.allowed) {
      this._showUpgradeModal(protocol);
      return;
    }

    if (!this.practitioner.isAuthenticated) {
      this._showAuthModal('login');
      return;
    }

    this._showSessionGate(protocol);
  }

  async startSession(protocol) {
    const density = this.practitioner.prefDensity;
    this._activeSession = {
      protocol,
      startedAt: new Date().toISOString(),
      density,
    };

    this.engine.onStateChange((state, proto, meta) => {
      if (state === 'idle' && meta) {
        this._completeSession(meta.elapsed, meta.complete);
      }
      this._updatePlayerBar(state, proto);
    });

    this.engine.onProgress((elapsed, progress) => {
      this._updatePlayerProgress(elapsed, progress, protocol.duration_s);
    });

    await this.engine.initProtocol(protocol, density);
    this.access.audit(protocol.id, 'enter');
    this._showPlayerBar(protocol);
  }

  _completeSession(elapsed, complete) {
    if (!this._currentLog || !this._activeSession) return;
    const { protocol, startedAt } = this._activeSession;
    const pctHeard = Math.min(1.0, elapsed / protocol.duration_s);

    this._currentLog.record({
      protocolId: protocol.id,
      protocolTitle: protocol.title,
      startedAt,
      endedAt: new Date().toISOString(),
      completed: complete,
      pctHeard,
      abandonPointS: complete ? null : Math.floor(elapsed),
      tierAtTime: this.practitioner.tier,
    });

    this._hidePlayerBar();
    this._activeSession = null;

    if (complete) {
      this.toast('Session complete. Record logged.', 'ok');
    }
  }

  // ─── Player Bar ───────────────────────────────────────────────

  _initPlayerBar() {
    this._playerBar = document.getElementById('player-bar');
    if (!this._playerBar) return;

    const playBtn = this._playerBar.querySelector('[data-action="play-pause"]');
    const stopBtn = this._playerBar.querySelector('[data-action="stop"]');
    const densitySlider = this._playerBar.querySelector('[data-density-slider]');

    if (playBtn) playBtn.addEventListener('click', () => this._togglePlay());
    if (stopBtn) stopBtn.addEventListener('click', () => this._stopSession());
    if (densitySlider) {
      densitySlider.addEventListener('input', (e) => {
        this.engine.applyDensity(parseFloat(e.target.value));
      });
    }
  }

  _showPlayerBar(protocol) {
    if (!this._playerBar) return;
    const title = this._playerBar.querySelector('[data-player-title]');
    const meta = this._playerBar.querySelector('[data-player-meta]');
    if (title) title.textContent = protocol.title;
    if (meta) meta.textContent = `${protocol.classification.replace('_',' ')} · ${_formatDuration(protocol.duration_s)} · density ${protocol.density_class.toFixed(2)}`;
    this._playerBar.classList.add('visible');
  }

  _hidePlayerBar() {
    if (!this._playerBar) return;
    this._playerBar.classList.remove('visible');
  }

  _updatePlayerBar(state) {
    if (!this._playerBar) return;
    const btn = this._playerBar.querySelector('[data-action="play-pause"]');
    if (btn) btn.textContent = state === 'active' ? '⏸' : '▶';
  }

  _updatePlayerProgress(elapsed, progress, durationS) {
    const fill = document.querySelector('[data-progress-fill]');
    const current = document.querySelector('[data-time-current]');
    const total = document.querySelector('[data-time-total]');
    if (fill) fill.style.width = (progress * 100) + '%';
    if (current) current.textContent = _formatDuration(elapsed);
    if (total) total.textContent = _formatDuration(durationS);
  }

  _togglePlay() {
    if (this.engine.state === 'active') this.engine.pause();
    else if (this.engine.state === 'paused') this.engine.resume();
  }

  _stopSession() {
    if (this.engine.state === 'idle') return;
    const { elapsed } = this.engine.terminate(false);
    this._completeSession(elapsed, false);
  }

  // ─── Modals ───────────────────────────────────────────────────

  _showSessionGate(protocol) {
    const overlay = document.getElementById('gate-overlay');
    if (!overlay) {
      // Direct start if no gate UI on this page
      this.startSession(protocol);
      return;
    }
    overlay.dataset.protocolId = protocol.id;
    overlay.querySelector('[data-gate-title]').textContent = protocol.title;
    overlay.querySelector('[data-gate-duration]').textContent = _formatDuration(protocol.duration_s);
    overlay.querySelector('[data-gate-density]').textContent = protocol.density_class.toFixed(2);
    overlay.querySelector('[data-gate-cls]').textContent = protocol.classification.replace('_',' ');
    overlay.querySelector('[data-gate-season]').textContent = protocol.season;
    overlay.classList.add('open');
  }

  _showAuthModal(mode = 'login') {
    const overlay = document.getElementById('auth-overlay');
    if (!overlay) {
      window.location.href = 'index.html?auth=' + mode;
      return;
    }
    overlay.dataset.mode = mode;
    overlay.classList.add('open');
  }

  _showUpgradeModal(protocol) {
    const overlay = document.getElementById('upgrade-overlay');
    if (!overlay) {
      this.toast('Practitioner membership required. £9.99/month.', 'warn');
      return;
    }
    overlay.classList.add('open');
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // ─── Toasts ───────────────────────────────────────────────────

  _initToasts() {
    if (!document.getElementById('toast-container')) {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
  }

  toast(message, type = 'ok') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ─── Nav State ───────────────────────────────────────────────

  _bindNavState() {
    this.practitioner.onChange(() => {
      this._updateNavTier();
      if (this.practitioner.isAuthenticated && !this._currentLog) {
        this._currentLog = new SessionLog(this.practitioner.id);
      }
    });
  }

  _updateNavTier() {
    const badge = document.querySelector('[data-nav-tier]');
    const authLinks = document.querySelectorAll('[data-auth-link]');
    const loginLink = document.querySelector('[data-login-link]');

    if (badge) {
      if (this.practitioner.isAuthenticated) {
        badge.textContent = this.practitioner.tier;
        badge.className = `tier-badge tier-badge--${this.practitioner.tier}`;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    authLinks.forEach(el => {
      el.style.display = this.practitioner.isAuthenticated ? '' : 'none';
    });

    if (loginLink) {
      loginLink.style.display = this.practitioner.isAuthenticated ? 'none' : '';
    }
  }
}

// ─── Global Utilities ─────────────────────────────────────────

function _formatDuration(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2,'0')}m`;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

function _formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function _classLabel(cls) {
  const map = {
    high_density: 'High Density',
    low_density: 'Low Density',
    transitional: 'Transitional',
    field_recording: 'Field Recording',
    seasonal: 'Seasonal',
    archival: 'Archival',
  };
  return map[cls] || cls;
}

function _densityLabel(v) {
  if (v >= 0.8) return 'Extreme';
  if (v >= 0.6) return 'High';
  if (v >= 0.4) return 'Mid';
  if (v >= 0.2) return 'Low';
  return 'Trace';
}

function _buildWaveform(densityClass, count = 40) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const base = densityClass * 0.7;
    const noise = (Math.random() - 0.5) * 0.4;
    const h = Math.max(8, Math.min(100, (base + noise) * 100));
    bars.push(`<div class="waveform__bar" style="height:${h}%"></div>`);
  }
  return `<div class="waveform">${bars.join('')}</div>`;
}

window.MaZenApp = MaZenApp;
window._formatDuration = _formatDuration;
window._formatDate = _formatDate;
window._classLabel = _classLabel;
window._densityLabel = _densityLabel;
window._buildWaveform = _buildWaveform;
