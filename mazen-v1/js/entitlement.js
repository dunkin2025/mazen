/* MA-ZEN — entitlement.js  (EntitlementEngine)
   Provides: EntitlementEngine
   Controls what protocols/features are accessible per tier
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  /* Free-tier protocol IDs */
  const FREE_PROTOCOLS = new Set(['KAZE', 'SEIJAKU', 'TAKE', 'GAKE', 'AKANE']);

  /* Grace period after trial ends (days) */
  const GRACE_DAYS = 3;

  const EntitlementEngine = {

    /* ── TIER ── */
    getEffectiveTier() {
      const user = MazenDB.getUser();
      return user.tier || 'FREE';
    },

    isSubscriber() {
      const t = this.getEffectiveTier();
      return t === 'subscriber' || t === 'SUBSCRIBER';
    },

    isInTrial() {
      const user = MazenDB.getUser();
      return user.tier === 'free_trial' && (user.trial_days_remaining || 0) > 0;
    },

    isInGrace() {
      const user = MazenDB.getUser();
      if (user.tier !== 'free_trial') return false;
      const remaining = user.trial_days_remaining || 0;
      return remaining <= 0 && remaining > -GRACE_DAYS;
    },

    /* ── PROTOCOL ACCESS ── */
    checkProtocol(protocolId) {
      if (this.isSubscriber() || this.isInTrial()) return true;
      return FREE_PROTOCOLS.has(protocolId);
    },

    /* ── GATE PROTOCOL CARDS ── */
    gateProtocolCards(gridEl) {
      if (!gridEl) return;
      const isSub = this.isSubscriber() || this.isInTrial();
      gridEl.querySelectorAll('.protocol-card').forEach(card => {
        const id = card.dataset.id || card.dataset.protocolId;
        if (!id) return;
        if (!isSub && !FREE_PROTOCOLS.has(id)) {
          card.classList.add('locked');
          if (!card.querySelector('.lock-badge')) {
            const badge = document.createElement('span');
            badge.className = 'lock-badge';
            badge.textContent = 'THE FLOOR';
            card.appendChild(badge);
          }
        } else {
          card.classList.remove('locked');
          card.querySelector('.lock-badge')?.remove();
        }
      });
    },

    /* ── GATE ELEMENT ── */
    gateElement(elementId, resource, opts = {}) {
      const el = document.getElementById(elementId);
      if (!el) return;
      const allowed = this.isSubscriber() || this.isInTrial();
      if (!allowed) {
        if (!opts.noOverlay) {
          el.style.opacity = '0.4';
          el.style.pointerEvents = 'none';
        } else {
          el.disabled = true;
          el.title = 'Upgrade to access this feature';
        }
      }
    },

    /* ── LOG DECISION ── */
    logDecision(entry) {
      // In production: send to analytics / audit log
      // For now: silent
    },

    /* ── GET ACCESS REASON ── */
    getAccessReason(protocolId) {
      if (this.isSubscriber()) return { granted: true, reason: 'subscriber' };
      if (this.isInTrial())    return { granted: true, reason: 'trial' };
      if (FREE_PROTOCOLS.has(protocolId)) return { granted: true, reason: 'free_protocol' };
      return { granted: false, reason: 'requires_subscription' };
    }
  };

  window.EntitlementEngine = EntitlementEngine;
})(window);
