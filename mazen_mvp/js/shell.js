
(function(window){
  'use strict';

  const pathname = location.pathname.split('/').pop() || 'index.html';
  const publicPages = new Set(['index.html','auth.html']);
  const protectedPages = new Set(['app.html','library.html','search.html','protocol.html','player.html','history.html','favorites.html','field-report.html','checkout.html','preferences.html']);
  const utilityPages = new Set(['help.html','legal.html','status.html']);
  const adminPages = new Set(['admin.html']);

  const CONFIG = {
    publicLinks: [
      ['auth.html?next=app.html','Sign in'],
      ['help.html','Help'],
      ['legal.html','Legal']
    ],
    landingLinks: [
      ['#protocols-section','Protocols'],
      ['#pricing','Pricing'],
      ['#faq','FAQ'],
      ['help.html','Help'],
      ['legal.html','Legal']
    ],
    appLinks: [
      ['app.html','App'],
      ['library.html','Library'],
      ['search.html','Search'],
      ['history.html','History'],
      ['favorites.html','Favorites'],
      ['help.html','Help'],
      ['preferences.html','Practice']
    ],
    footerLinks: [
      ['help.html','Help'],
      ['legal.html#privacy','Privacy'],
      ['legal.html#terms','Terms'],
      ['status.html','Status']
    ]
  };

  function body(){ return document.body; }
  function getUser(){
    try { return JSON.parse(localStorage.getItem('mz:user') || 'null'); } catch { return null; }
  }
  function isLoggedIn(){ const u = getUser(); return !!(u && u.id); }
  function nextUrl(){ return encodeURIComponent(pathname + location.search + location.hash); }

  function guard(){
    if (protectedPages.has(pathname) && !isLoggedIn()) {
      location.replace('auth.html?next=' + nextUrl());
      return true;
    }
    // Allow auth.html to remain reachable even for signed-in users.
    // This avoids forced redirects when users want to review or re-test the auth screen.
    return false;
  }
  if (guard()) return;

  function pageFromPath(){ return pathname.replace(/\.html$/,''); }
  function shellFromPath(){
    if (publicPages.has(pathname)) return 'public';
    if (protectedPages.has(pathname)) return 'app';
    if (utilityPages.has(pathname)) return 'utility';
    if (adminPages.has(pathname)) return 'admin';
    return 'public';
  }

  function ensureBodyMetadata(){
    if (!body()) return;
    body().dataset.page = body().dataset.page || pageFromPath();
    body().dataset.shell = body().dataset.shell || shellFromPath();
    body().classList.add('mz-shell-ready');
  }

  function activeMatch(href){
    if (href === 'app.html') return pathname === 'app.html';
    if (href === 'library.html') return pathname === 'library.html';
    return pathname === href;
  }
  function navLink(href, label, extra=''){
    const phoneOnly = ''; 
    const active = activeMatch(href) || (href==='library.html' && pathname==='protocol.html') || (href==='history.html' && pathname==='player.html');
    return `<a href="${href}" class="mz-route-link${active ? ' active' : ''} ${extra}">${label}</a>`;
  }


  function toggleButton(cls, label){
    return `<button class="${cls}" type="button" aria-expanded="false" aria-label="Toggle navigation"><span class="${cls.includes('landing') ? 'landing-nav-icon' : 'mz-nav-icon'}"><span></span></span><span>${label}</span></button>`;
  }

  function bindDisclosure(root, menuSelector, toggleSelector){
    if (!root) return;
    const menu = root.querySelector(menuSelector);
    const toggle = root.querySelector(toggleSelector);
    if (!menu || !toggle) return;
    const close = () => { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); };
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    window.addEventListener('resize', () => { if (window.innerWidth > 900) close(); });
  }

  function backTarget(){
    try {
      const last = window.MazenState && window.MazenState.getLastPage && window.MazenState.getLastPage();
      if (last && last.page) {
        if (protectedPages.has(last.page) && isLoggedIn()) return last.page;
        if ((last.page === 'index.html' || utilityPages.has(last.page) || last.page === 'auth.html')) return last.page;
      }
    } catch {}
    return isLoggedIn() ? 'app.html' : 'index.html';
  }

  function upsertFooter(){
    if (adminPages.has(pathname)) return;
    const mount = document.querySelector('.mz-shell-footer');
    if (mount) return;
    const footer = document.createElement('footer');
    footer.className = 'mz-shell-footer';
    footer.innerHTML = `
      <div class="mz-shell-footer-brand">
        <div class="mz-route-brand">MA-ZEN</div>
        <div class="mz-shell-subcopy">Governed silence protocols · static phase</div>
      </div>
      <div class="mz-shell-footer-links">
        ${CONFIG.footerLinks.map(([h,l]) => `<a href="${h}">${l}</a>`).join('')}
      </div>`;
    const target = document.querySelector('main') || document.querySelector('.page') || document.body;
    target.appendChild(footer);
  }

  function patchLanding(){
    document.querySelectorAll('a[href="app.html"], button[data-href="app.html"]').forEach(el => {
      const label = (el.textContent || '').toUpperCase();
      if (/BEGIN|FLOOR|SIGN|TRY|VIEW ALL|FIRST SESSION/.test(label)) {
        if (el.tagName === 'A') el.setAttribute('href','auth.html?next=app.html');
        else el.dataset.href = 'auth.html?next=app.html';
      }
    });
    const nav = document.getElementById('nav');
    if (nav) {
      const links = nav.querySelector('.nav-links');
      if (links) links.innerHTML = [
        ...CONFIG.landingLinks.map(([h,l]) => `<a href="${h}" class="nav-link">${l.toUpperCase()}</a>`),
        '<a href="auth.html?next=app.html" class="nav-cta"><span>SIGN IN</span></a>'
      ].join('');
      if (!nav.querySelector('.landing-nav-toggle')) { nav.insertAdjacentHTML('beforeend', toggleButton('landing-nav-toggle','Menu')); }
      const brand = nav.querySelector('.nav-brand');
      if (brand) brand.innerHTML = 'MA-ZEN<span>GOVERNED SILENCE</span>';
      bindDisclosure(nav, '.nav-links', '.landing-nav-toggle');
    }
    const footer = document.getElementById('footer');
    if (footer) {
      footer.innerHTML = `<div class="land-footer"><div class="land-footer-inner"><div class="land-footer-brand">MA-ZEN</div><div class="land-footer-links">${CONFIG.footerLinks.map(([h,l])=>`<a href="${h}" class="land-footer-link">${l.toUpperCase()}</a>`).join('')}</div><div class="land-footer-copy">© 2026 MA-ZEN · Governed Silence Protocols</div></div></div>`;
    }
  }

  function upsertPublicHeader(){
    if (pathname === 'index.html') return;
    if (document.querySelector('.mz-public-strip')) return;
    const strip = document.createElement('div');
    strip.className = 'mz-public-strip';
    strip.innerHTML = `
      <div class="mz-route-brand-wrap">
        <a href="index.html" class="mz-route-brand">MA-ZEN</a>
        <span class="mz-shell-subcopy">Public entry</span>
      </div>
      ${toggleButton('mz-nav-toggle','Menu')}
      <div class="mz-route-links">
        ${CONFIG.publicLinks.map(([h,l]) => navLink(h,l)).join('')}
      </div>`;
    bindDisclosure(strip, '.mz-route-links', '.mz-nav-toggle');
    document.body.insertBefore(strip, document.body.firstChild);
  }

  function appLinksHtml(){
    return CONFIG.appLinks.map(([h,l]) => navLink(h,l)).join('');
  }

  function patchTopbar(selector, buttonId){
    const nav = document.querySelector(selector);
    if (!nav) return false;
    nav.classList.add('mz-normalized-topbar');
    nav.innerHTML = `
      <a href="app.html" class="topbar-brand">MA-ZEN</a>
      ${toggleButton('mz-nav-toggle','Menu')}
      <div class="topbar-nav">
        ${appLinksHtml()}
        <button class="topbar-user" id="${buttonId || 'mzPracticeBtn'}">${isLoggedIn() ? 'MY PRACTICE' : 'SIGN IN'}</button>
      </div>`;
    bindDisclosure(nav, '.topbar-nav', '.mz-nav-toggle');
    return true;
  }

  function patchLibraryNav(){
    const nav = document.getElementById('lib-nav');
    if (!nav) return false;
    nav.classList.add('mz-normalized-topbar');
    nav.innerHTML = `
      <a href="app.html" class="lib-nav-brand">MA-ZEN</a>
      ${toggleButton('mz-nav-toggle','Menu')}
      <div class="lib-nav-links mz-route-links">${appLinksHtml()}</div>`;
    bindDisclosure(nav, '.lib-nav-links', '.mz-nav-toggle');
    return true;
  }

  function upsertAppStrip(kindText){
    if (document.querySelector('.mz-route-strip')) return;
    const strip = document.createElement('div');
    strip.className = 'mz-route-strip';
    strip.innerHTML = `
      <div class="mz-route-brand-wrap">
        <a href="app.html" class="mz-route-brand">MA-ZEN</a>
        <span class="mz-shell-subcopy">${kindText || 'Authenticated shell'}</span>
      </div>
      ${toggleButton('mz-nav-toggle','Menu')}
      <div class="mz-route-links">${appLinksHtml()}</div>`;
    bindDisclosure(strip, '.mz-route-links', '.mz-nav-toggle');
    document.body.insertBefore(strip, document.body.firstChild);
  }

  function patchCheckoutNav(){
    const nav = document.querySelector('body > nav');
    if (!nav || pathname !== 'checkout.html') return false;
    nav.classList.add('mz-normalized-topbar','mz-checkout-nav');
    nav.innerHTML = `
      <a href="app.html" class="mz-route-brand">MA-ZEN</a>
      ${toggleButton('mz-nav-toggle','Menu')}
      <div class="mz-route-links">${navLink('app.html','App')}${navLink('preferences.html','Practice')}${navLink('help.html','Help')}</div>`;
    bindDisclosure(nav, '.mz-route-links', '.mz-nav-toggle');
    return true;
  }

  function patchPlayer(){
    const top = document.querySelector('.player-topbar');
    if (!top) return false;
    const params = new URLSearchParams(location.search);
    const pid = params.get('id') || (window.MazenState && window.MazenState.getLastProtocol && window.MazenState.getLastProtocol()?.id) || '';
    top.innerHTML = `
      <a href="${pid ? ('protocol.html?id=' + encodeURIComponent(pid)) : 'app.html'}" class="player-exit">← PROTOCOL</a>
      ${toggleButton('mz-nav-toggle','Menu')}
      <div class="mz-route-links mz-player-links">
        ${navLink('app.html','App')}
        ${navLink('history.html','History')}
        ${navLink('favorites.html','Favorites')}
        ${navLink('help.html','Help')}
      </div>`;
    bindDisclosure(top, '.mz-route-links', '.mz-nav-toggle');
    if (typeof window.exitPlayer === 'function') {
      window.exitPlayer = function(){
        try { if (typeof window.saveProgress === 'function') window.saveProgress(); } catch(e){}
        const params = new URLSearchParams(location.search);
        const pid = params.get('id') || (window.MazenState && window.MazenState.getLastProtocol && window.MazenState.getLastProtocol()?.id);
        location.href = pid ? ('protocol.html?id=' + encodeURIComponent(pid)) : 'app.html';
      };
    }
    return true;
  }

  function patchPreferences(){
    if (pathname !== 'preferences.html') return false;
    upsertAppStrip('Practice hub');
    return true;
  }

  function patchUtilityHeader(){
    if (!utilityPages.has(pathname)) return false;
    if (document.querySelector('.mz-public-strip')) return true;
    const strip = document.createElement('div');
    strip.className = 'mz-public-strip mz-utility-strip';
    strip.innerHTML = `
      <div class="mz-route-brand-wrap">
        <a href="${backTarget()}" class="mz-route-back">← Back</a>
        <a href="${isLoggedIn() ? 'app.html' : 'index.html'}" class="mz-route-brand">MA-ZEN</a>
      </div>
      ${toggleButton('mz-nav-toggle','Menu')}
      <div class="mz-route-links">
        ${CONFIG.footerLinks.map(([h,l]) => navLink(h,l)).join('')}
      </div>`;
    bindDisclosure(strip, '.mz-route-links', '.mz-nav-toggle');
    document.body.insertBefore(strip, document.body.firstChild);
    return true;
  }

  function attachPracticeHandler(id){
    const btn = document.getElementById(id);
    if (!btn) return;
    const replacement = btn.cloneNode(true);
    btn.replaceWith(replacement);
    replacement.addEventListener('click', function(){
      location.href = isLoggedIn() ? 'preferences.html' : ('auth.html?next=' + nextUrl());
    });
    replacement.textContent = isLoggedIn() ? 'MY PRACTICE' : 'SIGN IN';
  }

  function removePlaceholderTitles(){
    document.querySelectorAll('[title*="coming soon" i],[title*="coming in" i]').forEach(el => el.removeAttribute('title'));
  }

  document.addEventListener('DOMContentLoaded', function(){
    ensureBodyMetadata();

    if (pathname === 'index.html') patchLanding();
    if (pathname === 'auth.html') upsertPublicHeader();
    if (['history.html','favorites.html','search.html','protocol.html'].includes(pathname)) patchTopbar('nav.topbar', 'oauthBtn');
    if (pathname === 'field-report.html') patchTopbar('nav.topbar', 'standby-btn');
    if (pathname === 'library.html') patchLibraryNav();
    if (pathname === 'checkout.html') patchCheckoutNav();
    if (pathname === 'player.html') patchPlayer();
    if (pathname === 'app.html') upsertAppStrip('Authenticated home');
    if (pathname === 'preferences.html') patchPreferences();
    if (utilityPages.has(pathname)) patchUtilityHeader();

    if (['history.html','favorites.html','search.html','protocol.html'].includes(pathname)) attachPracticeHandler('oauthBtn');
    if (pathname === 'field-report.html') attachPracticeHandler('standby-btn');

    removePlaceholderTitles();
    upsertFooter();
  });

  window.MazenShell = { isLoggedIn, getUser };
})(window);
