/* MA-ZEN — plans.js  (PlansModule)
   Provides: PlansModule
   Handles upgrade modals, paywall, trial activation
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  const PLANS = [
    {
      id: 'mazen_founding_monthly',
      name: 'FOUNDING MEMBER',
      price_mo: 7.99,
      note: 'Price locked forever. 87 seats remaining.',
      features: ['All 12 protocols', '45-min sessions', 'Full Silence Ladder', 'Lab + export', 'Price locked forever'],
      highlighted: false
    },
    {
      id: 'mazen_standard_monthly',
      name: 'STANDARD',
      price_mo: 9.99,
      note: '14-day free trial. Cancel any time.',
      features: ['All 12 protocols', '45-min sessions', 'Full Silence Ladder', 'Session history & streaks'],
      highlighted: true
    },
    {
      id: 'mazen_creator_monthly',
      name: 'CREATOR',
      price_mo: 24.99,
      note: 'For practitioners building with MA-ZEN.',
      features: ['Everything in Standard', 'Lab + research tools', 'Export (JSON/CSV)', 'THE CASH — B2B access'],
      highlighted: false
    }
  ];

  /* ── ENSURE OVERLAY ELEMENTS EXIST ── */
  function ensurePaywallDOM() {
    if (document.getElementById('paywall-overlay')) return;
    const el = document.createElement('div');
    el.id = 'paywall-overlay';
    el.innerHTML = `
      <div class="paywall-inner">
        <button class="paywall-close" id="paywall-close-btn">✕</button>
        <div class="paywall-kicker" id="pw-kicker">PROTOCOL LOCKED</div>
        <div class="paywall-header" id="pw-header">Access <span class="paywall-locked-name" id="pw-name">this protocol</span></div>
        <p class="paywall-locked-why" id="pw-why">This protocol requires The Floor subscription.</p>
        <div class="paywall-plans" id="pw-plans"></div>
        <div class="paywall-footer">
          <a href="checkout.html" id="pw-cta" style="display:inline-flex;align-items:center;justify-content:center;width:100%;padding:13px;font-family:var(--font-mono,'DM Mono',monospace);font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;background:var(--gold-glow);border:1px solid var(--gold);color:var(--gold);cursor:pointer;transition:all .25s;text-decoration:none">
            START 14-DAY FREE TRIAL →
          </a>
        </div>
        <p class="paywall-fine">No card required for trial. Cancel any time.</p>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('paywall-close-btn').addEventListener('click', () => PlansModule.closePaywall());
    el.addEventListener('click', e => { if (e.target === el) PlansModule.closePaywall(); });
  }

  function ensureUpgradeDOM() {
    if (document.getElementById('upgrade-modal')) return;
    const el = document.createElement('div');
    el.id = 'upgrade-modal';
    el.innerHTML = `
      <div class="upgrade-modal-inner">
        <button class="upgrade-close" id="upgrade-close-btn">✕</button>
        <p style="font-size:.56rem;letter-spacing:.22em;color:var(--gold);margin-bottom:8px">THE FLOOR — PLANS</p>
        <div style="font-family:var(--font-d,'Cormorant Garamond',serif);font-size:2rem;font-weight:300;margin-bottom:24px">Choose your <em>practice tier</em></div>
        <div id="upgrade-plans-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:20px"></div>
        <p style="text-align:center;font-size:.58rem;color:var(--type-faint)">All plans include a 14-day free trial. No credit card required.</p>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('upgrade-close-btn').addEventListener('click', () => {
      document.getElementById('upgrade-modal').classList.remove('open');
    });
    el.addEventListener('click', e => {
      if (e.target === el) el.classList.remove('open');
    });
  }

  const PlansModule = {

    /* ── OPEN PAYWALL ── */
    openPaywall(trigger, data = {}) {
      ensurePaywallDOM();
      const overlay = document.getElementById('paywall-overlay');
      const nameEl  = document.getElementById('pw-name');
      const whyEl   = document.getElementById('pw-why');
      const plansEl = document.getElementById('pw-plans');

      if (data.protocolKanji) nameEl.textContent = data.protocolKanji + ' ' + (data.protocolName || '');
      else nameEl.textContent = 'this protocol';

      if (data.protocolId) {
        whyEl.textContent = 'Protocol ' + data.protocolId + ' requires a Floor subscription. Start a free trial to access all 12 protocols.';
      }

      // Render plan pills
      plansEl.innerHTML = PLANS.slice(0,2).map(p => `
        <div class="paywall-plan ${p.highlighted ? 'highlighted' : ''}" onclick="window.location.href='checkout.html?plan=${p.id}'">
          <div>
            <div style="font-size:.56rem;letter-spacing:.2em;color:var(--type-dim);margin-bottom:3px">${p.name}</div>
            <div style="font-size:.62rem;color:var(--type-faint)">${p.note}</div>
          </div>
          <div style="font-family:var(--font-d,'Cormorant Garamond',serif);font-size:1.4rem;color:var(--gold);white-space:nowrap">
            $${p.price_mo}<span style="font-size:.6rem;font-family:var(--font-m,'DM Mono',monospace);color:var(--type-faint)">/mo</span>
          </div>
        </div>`).join('');

      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    closePaywall() {
      document.getElementById('paywall-overlay')?.classList.remove('open');
      document.body.style.overflow = '';
    },

    /* ── OPEN UPGRADE MODAL ── */
    openUpgradeModal(source) {
      ensureUpgradeDOM();
      const grid = document.getElementById('upgrade-plans-grid');
      grid.innerHTML = PLANS.map(p => `
        <div style="background:var(--navy);padding:24px 20px;cursor:pointer;transition:background .2s" onclick="window.location.href='checkout.html?plan=${p.id}'" onmouseenter="this.style.background='var(--deep)'" onmouseleave="this.style.background='var(--navy)'">
          ${p.highlighted ? '<p style="font-size:.48rem;letter-spacing:.16em;color:var(--gold);margin-bottom:6px">RECOMMENDED</p>' : '<p style="height:16px;margin-bottom:6px"></p>'}
          <p style="font-size:.58rem;letter-spacing:.18em;color:var(--type-dim);margin-bottom:8px">${p.name}</p>
          <p style="font-family:var(--font-d,'Cormorant Garamond',serif);font-size:2rem;font-weight:300;color:var(--type);margin-bottom:4px">$${p.price_mo}<span style="font-size:.65rem;font-family:var(--font-m,'DM Mono',monospace);color:var(--type-faint)">/mo</span></p>
          <p style="font-size:.58rem;color:var(--type-faint);margin-bottom:16px;line-height:1.6">${p.note}</p>
          <ul style="list-style:none;display:flex;flex-direction:column;gap:5px">
            ${p.features.map(f => `<li style="font-size:.6rem;color:var(--type-faint);padding-left:10px;border-left:1px solid var(--border)">${f}</li>`).join('')}
          </ul>
        </div>`).join('');

      document.getElementById('upgrade-modal').classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    /* ── PATCH PROTOCOL ACCESS (app.html) ── */
    patchProtocolAccess() {
      // Called after grid renders — EntitlementEngine handles the actual gating
      // This hook exists for any additional click-level paywall logic
      document.addEventListener('click', e => {
        const card = e.target.closest('.protocol-card.locked');
        if (!card) return;
        const id = card.dataset.id || card.dataset.protocolId || '';
        const kanji = card.querySelector('.card-kanji')?.textContent || '';
        const name  = card.querySelector('.card-name')?.textContent || id;
        this.openPaywall('protocol_card_click', { protocolId: id, protocolKanji: kanji, protocolName: name });
        e.stopPropagation();
        e.preventDefault();
      });
    },

    /* ── START TRIAL FROM URL PARAM ── */
    startTrialFromParam() {
      const user = MazenDB.getUser();
      if (user.tier === 'free_trial') return;
      user.tier = 'free_trial';
      user.trial_days_remaining = 14;
      MazenDB.setUser(user);
    },

    getPlanById(id) {
      return PLANS.find(p => p.id === id) || PLANS[1];
    },

    getPlans() { return PLANS; }
  };

  window.PlansModule = PlansModule;
})(window);
