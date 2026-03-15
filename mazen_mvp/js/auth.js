/* MA-ZEN — auth.js  (AuthModule)
   Provides: AuthModule
   Simulates auth operations via localStorage — no backend required
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  const AuthModule = {

    /* ── STATE ── */
    isLoggedIn() {
      return !!(MazenDB || MAZEN_DB).isLoggedIn();
    },

    getCurrentUser() {
      return (MazenDB || MAZEN_DB).getUser();
    },

    /* ── HEADER UI SYNC ── */
    syncHeaderUI() {
      const user = this.getCurrentUser();
      const tier = user.tier || 'FREE';

      // Update plan pill if present
      const planPill = document.querySelector('.plan-pill');
      if (planPill) {
        const tierMap = { free_trial: 'TRIAL', subscriber: 'SUBSCRIBER', free: 'FREE' };
        const cls = tierMap[tier] || 'FREE';
        planPill.className = `plan-pill ${cls}`;
        planPill.textContent = tier === 'free_trial' ? `TRIAL · ${user.trial_days_remaining || 14}d` : cls;
      }

      // Account button if present
      const accountBtn = document.querySelector('.account-btn');
      if (accountBtn) {
        const dot = accountBtn.querySelector('.account-btn-dot');
        if (dot) dot.className = `account-btn-dot ${tier === 'subscriber' ? 'SUBSCRIBER' : tier === 'free_trial' ? 'TRIAL' : ''}`;
        const label = accountBtn.querySelector('.account-btn-label');
        if (label) label.textContent = user.name || user.email || 'ACCOUNT';
      }
    },

    /* ── VALIDATION ── */
    validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /* ── ALERT HELPERS ── */
    showAlert(elementId, message, type = 'info') {
      const el = document.getElementById(elementId);
      if (!el) return;
      el.textContent = message;
      el.className = `auth-alert show ${type}`;
      el.style.display = 'block';
    },

    hideAlert(elementId) {
      const el = document.getElementById(elementId);
      if (!el) return;
      el.className = 'auth-alert';
      el.style.display = 'none';
    },

    /* ── SUBMIT LOADING STATE ── */
    setSubmitLoading(btn, loading, loadingText) {
      if (!btn) return;
      if (loading) {
        btn._originalText = btn.querySelector('span')?.textContent || btn.textContent;
        const span = btn.querySelector('span');
        if (span) span.textContent = loadingText || 'LOADING…';
        else btn.textContent = loadingText || 'LOADING…';
        btn.disabled = true;
        btn.style.opacity = '0.7';
      } else {
        const span = btn.querySelector('span');
        if (span) span.textContent = btn._originalText || span.textContent;
        else btn.textContent = btn._originalText || btn.textContent;
        btn.disabled = false;
        btn.style.opacity = '';
      }
    },

    /* ── SIMULATED AUTH OPERATIONS ── */
    async login(email, password) {
      await _delay(600);
      // Simulate: any valid-format email/pass combo succeeds
      if (!email || !password) return { success: false, message: 'Email and password required.' };
      const user = {
        id: 'u-' + Date.now(),
        email, name: email.split('@')[0],
        tier: 'free_trial',
        trial_days_remaining: 14,
        created_at: Date.now(),
        last_seen_at: Date.now()
      };
      MazenDB.setUser(user);
      return { success: true, user };
    },

    async signUpEmail(email, password, name) {
      await _delay(800);
      if (!email || !password) return { success: false, message: 'All fields required.' };
      const user = {
        id: 'u-' + Date.now(),
        email, name: name || email.split('@')[0],
        tier: 'free_trial',
        trial_days_remaining: 14,
        created_at: Date.now(),
        last_seen_at: Date.now()
      };
      MazenDB.setUser(user);
      return { success: true, user, needs_verification: false };
    },

    async sendVerificationEmail(email) {
      await _delay(400);
      return { success: true, message: `Verification code sent to ${email}.` };
    },

    async verifyEmail(code) {
      await _delay(500);
      if (!code || code.length < 6) return { success: false, message: 'Invalid code.' };
      return { success: true };
    },

    async sendPasswordReset(email) {
      await _delay(500);
      if (!this.validateEmail(email)) return { success: false, message: 'Please enter a valid email address.' };
      return { success: true, message: `If an account exists for ${email}, a reset link has been sent.` };
    },

    async initiateOAuth(provider) {
      await _delay(300);
      // Simulate OAuth — in production this would redirect to OAuth provider
      const user = {
        id: 'u-oauth-' + Date.now(),
        email: `user@${provider}.example`,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        tier: 'free_trial',
        trial_days_remaining: 14,
        created_at: Date.now(),
        last_seen_at: Date.now()
      };
      MazenDB.setUser(user);
      return { success: true, user };
    },

    async logout() {
      localStorage.removeItem('mz:user');
      return { success: true };
    },

    /* ── PASSWORD STRENGTH ── */
    bindPasswordStrength(input, bar, label) {
      if (!input || !bar || !label) return;
      input.addEventListener('input', () => {
        const v = input.value;
        let score = 0;
        if (v.length >= 8) score++;
        if (/[A-Z]/.test(v)) score++;
        if (/[0-9]/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;
        const pct = (score / 4) * 100;
        const colors = ['#C08080','#C09878','#C4944A','#8BA87B'];
        const labels = ['WEAK','FAIR','GOOD','STRONG'];
        bar.style.width = pct + '%';
        bar.style.background = colors[score - 1] || 'transparent';
        label.textContent = labels[score - 1] || '';
      });
    }
  };

  function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  window.AuthModule = AuthModule;
})(window);
