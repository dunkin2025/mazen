/* MA-ZEN — payments.js  (PaymentsModule)
   Provides: PaymentsModule
   Simulates billing/subscription lifecycle via localStorage
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  const BILLING_KEY = 'mz:billing';
  const INVOICE_KEY = 'mz:invoice_history';
  const PENDING_KEY = 'mz:checkout_pending';

  const PLAN_MAP = {
    mazen_founding_monthly: { plan_tier: 'founding', interval: 'month', amount_cents: 799, label: 'Founding Member' },
    mazen_founding_annual:  { plan_tier: 'founding', interval: 'year',  amount_cents: 7999, label: 'Founding Member' },
    mazen_standard_monthly: { plan_tier: 'standard', interval: 'month', amount_cents: 999, label: 'Standard' },
    mazen_standard_annual:  { plan_tier: 'standard', interval: 'year',  amount_cents: 9999, label: 'Standard' },
    mazen_creator_monthly:  { plan_tier: 'creator',  interval: 'month', amount_cents: 2499, label: 'Creator' },
    mazen_creator_annual:   { plan_tier: 'creator',  interval: 'year',  amount_cents: 24999, label: 'Creator' }
  };

  const PaymentsModule = {

    /* ── BILLING STATUS ── */
    getBillingStatus() {
      try {
        return JSON.parse(localStorage.getItem(BILLING_KEY) || '{}');
      } catch {
        return {};
      }
    },

    /* ── CHECKOUT START ── */
    startCheckout(lookupKey) {
      const plan = this._getPlanMeta(lookupKey);
      if (!plan) {
        this._showBillingToast('Selected plan is unavailable.');
        return { success: false, error: 'invalid_plan' };
      }

      const pending = {
        lookup_key: lookupKey,
        plan_tier: plan.plan_tier,
        interval: plan.interval,
        amount_cents: plan.amount_cents,
        started_at: Date.now(),
        simulated: true
      };
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

      const url = new URL('checkout.html', window.location.href);
      url.searchParams.set('status', 'success');
      url.searchParams.set('simulated', '1');
      url.searchParams.set('plan', lookupKey);
      window.location.href = url.toString();
      return { success: true, pending };
    },

    /* ── OPEN BILLING PORTAL ── */
    openBillingPortal() {
      const url = new URL('checkout.html', window.location.href);
      url.searchParams.set('view', 'billing');
      window.location.href = url.toString();
      return { success: true };
    },

    /* ── HANDLE CHECKOUT RETURN ── */
    handleCheckoutReturn() {
      const params = new URLSearchParams(window.location.search);
      const planKey = params.get('plan') || this._readPending()?.lookup_key || 'mazen_standard_monthly';
      const plan = this._getPlanMeta(planKey) || PLAN_MAP.mazen_standard_monthly;
      const now = Date.now();
      const user = (window.MazenDB && MazenDB.getUser()) || { id: null };

      const updatedUser = Object.assign({}, user, {
        id: user.id || ('u-' + now),
        tier: 'subscriber',
        plan: planKey,
        plan_tier: plan.plan_tier,
        trial_days_remaining: 14,
        subscribed_at: now,
        last_seen_at: now
      });
      if (window.MazenDB && MazenDB.setUser) MazenDB.setUser(updatedUser);

      const billingState = {
        is_active: true,
        is_past_due: false,
        plan_id: planKey,
        plan_tier: plan.plan_tier,
        interval: plan.interval,
        amount_cents: plan.amount_cents,
        subscribed_at: now,
        current_period_end: this._periodEndISO(plan.interval, now),
        simulated: true,
        card_brand: 'visa',
        card_last4: '4242'
      };
      localStorage.setItem(BILLING_KEY, JSON.stringify(billingState));
      localStorage.removeItem(PENDING_KEY);

      this._showBillingToast('Subscription activated. Welcome to The Floor.');

      const url = new URL(window.location.href);
      ['checkout', 'status', 'simulated', 'plan'].forEach(k => url.searchParams.delete(k));
      window.history.replaceState({}, '', url.toString());

      return {
        success: true,
        simulated: true,
        plan_id: planKey,
        plan_tier: plan.plan_tier,
        interval: plan.interval,
        amount_cents: plan.amount_cents,
        user: updatedUser
      };
    },

    /* ── BILLING MANAGEMENT RENDER ── */
    renderBillingStatus(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const billing = this.getBillingStatus();
      const invoices = this.getInvoiceHistory();

      if (!billing.is_active) {
        container.innerHTML = `
          <div class="billing-card">
            <p style="font-size:.58rem;letter-spacing:.08em;color:var(--type-faint);margin-bottom:8px">NO ACTIVE SUBSCRIPTION</p>
            <p style="font-size:.66rem;line-height:1.7;color:var(--type-faint);margin-bottom:18px">You are currently using the preview or trial experience.</p>
            <a href="checkout.html" class="checkout-cta-btn" style="display:inline-flex;text-decoration:none;width:auto;padding:12px 24px"><span>VIEW PLANS →</span></a>
          </div>`;
        return;
      }

      const planLabel = this._labelForTier(billing.plan_tier);
      const amount = (billing.amount_cents || 0) / 100;
      const nextCharge = billing.current_period_end ? new Date(billing.current_period_end).toLocaleDateString() : '—';
      const invoiceHtml = invoices.length
        ? invoices.slice(0, 5).map(inv => `
            <div style="display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="color:var(--type-faint)">${new Date(inv.created_at).toLocaleDateString()}</span>
              <span>$${(inv.amount_cents/100).toFixed(2)}</span>
              <span style="color:${inv.status === 'paid' ? 'var(--trans)' : 'var(--gold)'}">${inv.status.toUpperCase()}</span>
            </div>`).join('')
        : '<p style="color:var(--type-faint)">No invoices yet.</p>';

      container.innerHTML = `
        <div class="billing-card" style="border:1px solid var(--border);padding:24px;background:rgba(255,255,255,.02)">
          <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px">
            <div>
              <p style="font-size:.52rem;letter-spacing:.14em;color:var(--type-faint);margin-bottom:6px">ACTIVE PLAN</p>
              <p style="font-size:1rem">${planLabel} · ${billing.interval === 'year' ? 'Annual' : 'Monthly'}</p>
            </div>
            <div style="text-align:right">
              <p style="font-size:.52rem;letter-spacing:.14em;color:var(--type-faint);margin-bottom:6px">AMOUNT</p>
              <p style="font-size:1rem">$${amount.toFixed(2)}${billing.interval === 'year' ? '/yr' : '/mo'}</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px">
            <div>
              <p style="font-size:.52rem;letter-spacing:.14em;color:var(--type-faint);margin-bottom:6px">NEXT BILLING DATE</p>
              <p>${nextCharge}</p>
            </div>
            <div>
              <p style="font-size:.52rem;letter-spacing:.14em;color:var(--type-faint);margin-bottom:6px">PAYMENT METHOD</p>
              <p>${(billing.card_brand || 'card').toUpperCase()} ending in ${billing.card_last4 || '4242'}</p>
            </div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">
            <button id="billing-update-btn" class="checkout-cta-btn" style="width:auto;padding:12px 20px"><span>UPDATE PAYMENT</span></button>
            <button id="billing-cancel-btn" style="padding:12px 20px;border:1px solid var(--border);color:var(--type-faint);font-size:.58rem;letter-spacing:.12em">CANCEL PLAN</button>
          </div>
          <div>
            <p style="font-size:.52rem;letter-spacing:.14em;color:var(--type-faint);margin-bottom:8px">RECENT INVOICES</p>
            ${invoiceHtml}
          </div>
        </div>`;

      document.getElementById('billing-update-btn')?.addEventListener('click', () => {
        this._showBillingToast('Payment method updated. (Simulated)');
      });
      document.getElementById('billing-cancel-btn')?.addEventListener('click', () => {
        this.cancelSubscription();
        this.renderBillingStatus(containerId);
        this._showBillingToast('Subscription canceled. Access remains until period end in production.');
      });
    },

    /* ── CANCEL (simulated) ── */
    cancelSubscription() {
      const user = (window.MazenDB && MazenDB.getUser()) || {};
      user.tier = 'free_trial';
      user.plan = null;
      user.plan_tier = null;
      user.trial_days_remaining = 0;
      if (window.MazenDB && MazenDB.setUser) MazenDB.setUser(user);
      localStorage.removeItem(BILLING_KEY);
      return { success: true };
    },

    /* ── INVOICE HISTORY ── */
    getInvoiceHistory() {
      try {
        return JSON.parse(localStorage.getItem(INVOICE_KEY) || '[]');
      } catch {
        return [];
      }
    },

    _seedInvoiceHistory(tier, amountCents) {
      const invoices = this.getInvoiceHistory();
      const now = Date.now();
      const planLabel = this._labelForTier(tier);
      invoices.unshift({
        id: 'inv_' + now,
        plan_tier: tier,
        plan_label: planLabel,
        amount_cents: amountCents,
        status: 'paid',
        created_at: now,
        simulated: true
      });
      localStorage.setItem(INVOICE_KEY, JSON.stringify(invoices.slice(0, 20)));
      return invoices[0];
    },

    /* ── INTERNAL HELPERS ── */
    _readPending() {
      try {
        return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      } catch {
        return null;
      }
    },

    _getPlanMeta(lookupKey) {
      return PLAN_MAP[lookupKey] || null;
    },

    _periodEndISO(interval, now) {
      const d = new Date(now);
      if (interval === 'year') d.setFullYear(d.getFullYear() + 1);
      else d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    },

    _labelForTier(tier) {
      return ({ founding: 'Founding Member', standard: 'Standard', creator: 'Creator' }[tier]) || 'Standard';
    },

    _showBillingToast(msg) {
      const container = document.getElementById('toast-container') || document.querySelector('.toast-container');
      if (!container) {
        console.log('[Billing]', msg);
        return;
      }
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = msg;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, 4000);
    }
  };

  window.PaymentsModule = PaymentsModule;
})(window);
