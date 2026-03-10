/* MA-ZEN — landing.js  (LandingModule)
   Provides: LandingModule
   Renders dynamic sections on index.html
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  const LandingModule = {

    init() {
      this.renderDistinction();
      this.renderHowItWorks();
      this.renderTestimonials();
      this.renderSocialProof();
      this.renderPricingBlocks();
      this.renderFAQAccordion();
      this.renderWaitlist();
      this.renderFooter();
      this._initReveal();
      this._initCTAButtons();
    },

    /* ── DISTINCTION ── */
    renderDistinction() {
      const el = document.querySelector('#distinction .section');
      if (!el) return;
      el.innerHTML = `
        <span class="section-eyebrow reveal">NOT WHAT YOU THINK</span>
        <h2 class="section-title reveal">What makes MA-ZEN <em>different</em></h2>
        <div class="land-distinction-grid reveal">
          <div class="land-distinction-cell">
            <div class="land-dist-head">WHAT IT IS NOT</div>
            <div class="land-dist-body">Not ambient music. Not meditation background audio. Not a playlist. Not a soundscape generator. Not infinite. Not designed to be pleasant.</div>
          </div>
          <div class="land-distinction-cell">
            <div class="land-dist-head">WHAT IT IS</div>
            <div class="land-dist-body">A governed protocol system. Each session is finite, structured, and ends. Silence is the primary material — audio events are sparse, meaningful, and mathematically spaced.</div>
          </div>
          <div class="land-distinction-cell">
            <div class="land-dist-head">MA (間)</div>
            <div class="land-dist-body">The Japanese concept of meaningful interval. Silence is not absence — it is the structural material of the session. Every event is placed relative to the silence around it.</div>
          </div>
          <div class="land-distinction-cell">
            <div class="land-dist-head">GOVERNED ENTROPY</div>
            <div class="land-dist-body">Event timing follows compound sine wave phase curves — not randomness. The system produces acoustic behaviour that feels natural but is precisely controlled.</div>
          </div>
        </div>`;
    },

    /* ── HOW IT WORKS ── */
    renderHowItWorks() {
      const el = document.querySelector('#how .section');
      if (!el) return;
      el.innerHTML = `
        <span class="section-eyebrow reveal">THE PROCESS</span>
        <h2 class="section-title reveal">How a session <em>works</em></h2>
        <div class="land-hiw-steps reveal">
          <div class="land-hiw-step">
            <div class="land-hiw-num">01</div>
            <div class="land-hiw-title">Select outcome</div>
            <div class="land-hiw-body">Choose what you need: Focus, Decompression, Reset, Transition, or Reflection. Each outcome has dedicated protocols engineered for that cognitive state.</div>
          </div>
          <div class="land-hiw-step">
            <div class="land-hiw-num">02</div>
            <div class="land-hiw-title">Configure duration</div>
            <div class="land-hiw-body">Set your session length. The protocol adapts — not by cutting content, but by scaling the silence ratios and phase durations proportionally.</div>
          </div>
          <div class="land-hiw-step">
            <div class="land-hiw-num">03</div>
            <div class="land-hiw-title">The session ends</div>
            <div class="land-hiw-body">Unlike ambient audio, every session has a defined endpoint. The final phase always completes. You are never left hanging in an infinite loop.</div>
          </div>
        </div>`;
    },

    /* ── TESTIMONIALS ── */
    renderTestimonials() {
      const el = document.querySelector('#testimonials .section');
      if (!el) return;
      const quotes = [
        { q: '"The only tool I\'ve used that treats silence as architecture, not decoration."', attr: '— R. CHEN, Researcher' },
        { q: '"After three weeks, I stopped needing background music entirely. The protocols retrained my relationship with quiet."', attr: '— M. TANAKA, Designer' },
        { q: '"The fact that sessions end is the feature. Everything else is just background audio."', attr: '— J. OSEI, Engineer' }
      ];
      el.innerHTML = `
        <span class="section-eyebrow reveal">PRACTITIONERS</span>
        <h2 class="section-title reveal">What they <em>notice</em></h2>
        <div class="land-testimonials reveal">
          ${quotes.map(t => `
            <div class="land-testi">
              <div class="land-testi-q">${t.q}</div>
              <div class="land-testi-attr">${t.attr}</div>
            </div>`).join('')}
        </div>`;
    },

    /* ── SOCIAL PROOF ── */
    renderSocialProof() {
      const el = document.getElementById('social-proof');
      if (!el) return;
      el.innerHTML = `
        <div class="land-proof-strip">
          <div class="land-proof-cell"><span class="land-proof-n">25</span><span class="land-proof-l">GOVERNED PROTOCOLS</span></div>
          <div class="land-proof-cell"><span class="land-proof-n">6</span><span class="land-proof-l">SILENCE LADDER RUNGS</span></div>
          <div class="land-proof-cell"><span class="land-proof-n">100%</span><span class="land-proof-l">SESSIONS THAT END</span></div>
          <div class="land-proof-cell"><span class="land-proof-n">0</span><span class="land-proof-l">INFINITE LOOPS</span></div>
        </div>`;
    },

    /* ── PRICING ── */
    renderPricingBlocks() {
      const el = document.querySelector('#pricing .section');
      if (!el) return;
      const plans = [
        { name: 'FREE', badge: null, price: '0', sub: '/forever', note: '5 entry protocols. Sessions up to 20 min.', features: ['5 protocols (KAZE, SEIJAKU, TAKE, GAKE, AKANE)', 'Up to 20-minute sessions', 'Silence Ladder — Rungs 1–2', 'Basic session history'], cta: 'START FREE', href: 'app.html', featured: false },
        { name: 'STANDARD', badge: 'MOST POPULAR', price: '9.99', sub: '/month', note: '14-day free trial. Cancel any time.', features: ['All 12 protocols', 'Sessions up to 45 minutes', 'Full Silence Ladder (Rungs 1–6)', 'Complete session history + streaks', 'Protocol collections'], cta: 'START FREE TRIAL', href: 'checkout.html?plan=mazen_standard_monthly', featured: true },
        { name: 'FOUNDING MEMBER', badge: '87 SEATS REMAINING', price: '7.99', sub: '/month forever', note: 'Price locked for life once claimed.', features: ['Everything in Standard', 'Price locked permanently', 'Early access to new protocols', 'Founding member badge'], cta: 'CLAIM SEAT', href: 'checkout.html?plan=mazen_founding_monthly', featured: false }
      ];
      el.innerHTML = `
        <span class="section-eyebrow reveal">THE FLOOR — PLANS</span>
        <h2 class="section-title reveal">Choose your <em>practice</em></h2>
        <div class="land-pricing-grid reveal">
          ${plans.map(p => `
            <div class="land-plan ${p.featured ? 'featured' : ''}">
              ${p.badge ? `<div class="land-plan-badge">${p.badge}</div>` : '<div style="height:16px"></div>'}
              <div class="land-plan-name">${p.name}</div>
              <div class="land-plan-price"><sup>$</sup>${p.price}<sub>${p.sub}</sub></div>
              <div class="land-plan-note">${p.note}</div>
              <ul class="land-plan-feats">${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
              <a href="${p.href}" class="land-plan-cta">${p.cta} →</a>
            </div>`).join('')}
        </div>`;
    },

    /* ── FAQ ── */
    renderFAQAccordion() {
      const el = document.querySelector('#faq .section');
      if (!el) return;
      const faqs = [
        { q: 'Is this meditation?', a: 'No. MA-ZEN sessions are not guided meditation, mindfulness practice, or relaxation audio. They are acoustic architecture — structured silence protocols designed to produce specific cognitive outcomes. Some overlap in mechanism; the purpose and design are different.' },
        { q: 'Why do sessions end?', a: 'Endings are a design feature, not a limitation. Infinite loops create dependency on the audio environment. Finite sessions train attention within a defined container and return you to the world with the cognitive state produced — focus, decompression, or transition.' },
        { q: 'What is the Silence Ladder?', a: 'A six-rung progression system. Rung 1 uses entry protocols with lower silence density (40–60%). Rung 6 protocols can reach 90%+ silence ratio. Progress unlocks access to deeper, longer, and more demanding protocols.' },
        { q: 'What does it actually sound like?', a: 'Sparse acoustic events — field recordings, textured resonances, occasional tonal elements — set against governed silence. The audio is not musical. It is not pleasant in the conventional sense. It functions.' },
        { q: 'Can I use it at work?', a: 'That is the primary use case. The Floor is designed for knowledge workers, researchers, designers, and anyone who requires sustained cognitive performance. Sessions fit within work blocks: 10-minute resets, 30-minute focus sessions, end-of-day decompression.' },
        { q: 'What is the free tier?', a: 'Five entry-level protocols (KAZE, SEIJAKU, TAKE, GAKE, AKANE), sessions up to 20 minutes, and the first two Silence Ladder rungs. Enough to understand the system. The full library requires The Floor subscription.' }
      ];
      el.innerHTML = `
        <span class="section-eyebrow reveal">QUESTIONS</span>
        <h2 class="section-title reveal"><em>Common</em> questions</h2>
        <div class="land-faq reveal">
          ${faqs.map(f => `
            <div class="land-faq-item">
              <div class="land-faq-q"><span>${f.q}</span><span class="land-faq-arrow">↓</span></div>
              <div class="land-faq-a">${f.a}</div>
            </div>`).join('')}
        </div>`;

      el.querySelectorAll('.land-faq-q').forEach(q => {
        q.addEventListener('click', () => {
          q.parentElement.classList.toggle('open');
        });
      });
    },

    /* ── WAITLIST ── */
    renderWaitlist() {
      const el = document.getElementById('waitlist');
      if (!el) return;
      el.innerHTML = `
        <div class="land-waitlist">
          <span class="section-eyebrow" style="display:block;margin-bottom:10px">STAY INFORMED</span>
          <h2 class="section-title">New protocols, <em>first</em></h2>
          <p style="font-size:.68rem;color:var(--type-faint);max-width:400px;margin:0 auto;line-height:1.75">Protocol drops happen seasonally. Get notified when new collections become available.</p>
          <div class="land-waitlist-form" id="waitlist-form">
            <input class="land-waitlist-input" id="waitlist-email" type="email" placeholder="your@email.com" autocomplete="email" aria-label="Email address for the waitlist">
            <button class="land-plan-cta" style="white-space:nowrap" id="waitlist-submit">NOTIFY ME</button>
          </div>
          <p id="waitlist-confirm" style="display:none;font-size:.6rem;color:var(--outcome-transition);margin-top:12px;letter-spacing:.08em">You're on the list.</p>
        </div>`;

      document.getElementById('waitlist-submit')?.addEventListener('click', () => {
        const email = document.getElementById('waitlist-email').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        // Store locally
        const wl = JSON.parse(localStorage.getItem('mz:waitlist') || '[]');
        if (!wl.includes(email)) { wl.push(email); localStorage.setItem('mz:waitlist', JSON.stringify(wl)); }
        document.getElementById('waitlist-form').style.display = 'none';
        document.getElementById('waitlist-confirm').style.display = 'block';
      });
    },

    /* ── FOOTER ── */
    renderFooter() {
      const el = document.getElementById('footer');
      if (!el) return;
      el.innerHTML = `
        <div class="land-footer">
          <div class="land-footer-inner">
            <div class="land-footer-brand">MA-ZEN</div>
            <div class="land-footer-links">
              <a href="auth.html" class="land-footer-link">SIGN IN</a>
              <a href="help.html" class="land-footer-link">HELP</a>
              <a href="legal.html" class="land-footer-link">LEGAL</a>
              <a href="status.html" class="land-footer-link">STATUS</a>
            </div>
            <div class="land-footer-copy">© 2025 MA-ZEN · Governed Silence Protocols</div>
          </div>
        </div>`;
    },

    /* ── REVEAL ANIMATION ── */
    _initReveal() {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); } });
      }, { threshold: 0.08 });
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    },

    /* ── CTA BUTTONS ── */
    _initCTAButtons() {
      document.querySelectorAll('[data-cta][data-href]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.href = btn.dataset.href || 'auth.html?next=app.html';
        });
      });
    }
  };

  window.LandingModule = LandingModule;
})(window);
