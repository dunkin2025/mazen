
(function(window){
  'use strict';
  const K = {
    lastPage: 'mz:lastPage',
    lastProtocol: 'mz:lastProtocol',
    continueSession: 'mz:continueSession',
    lastRoute: 'mz:lastRoute'
  };
  function now(){ return Date.now(); }
  function read(key, fallback=null){
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }
  function write(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    return value;
  }
  function pathname(){ return (location.pathname.split('/').pop() || 'index.html'); }
  function params(){ return new URLSearchParams(location.search); }

  const State = {
    keys: K,
    get(key, fallback=null){ return read(key, fallback); },
    set(key, value){ return write(key, value); },
    setLastPage(page){ return write(K.lastPage, { page, at: now() }); },
    getLastPage(){ return read(K.lastPage, null); },
    setLastProtocol(id, source){
      if (!id) return null;
      return write(K.lastProtocol, { id, source: source || pathname(), at: now() });
    },
    getLastProtocol(){ return read(K.lastProtocol, null); },
    setContinueSession(session){
      if (!session || !session.id) return null;
      return write(K.continueSession, { ...session, at: now() });
    },
    getContinueSession(){ return read(K.continueSession, null); },
    clearContinueSession(){ try { localStorage.removeItem(K.continueSession); } catch {} },
    syncFromSessions(){
      try {
        const db = window.MazenDB || window.MAZEN_DB;
        if (!db || typeof db.getSessions !== 'function') return null;
        const sessions = db.getSessions() || [];
        const inc = sessions.find(s => !s.completed && s.protocolId);
        if (inc) {
          return this.setContinueSession({
            id: inc.id,
            protocolId: inc.protocolId,
            progressPct: inc.progressPct || 0,
            startedAt: inc.startedAt || now()
          });
        }
        const last = sessions[0];
        if (last && last.completed) this.clearContinueSession();
        return inc || null;
      } catch { return null; }
    },
    routeForProtocol(id){
      if (!id) return 'library.html';
      return 'protocol.html?id=' + encodeURIComponent(id);
    },
    routeForPlayer(id, sess){
      let url = 'player.html';
      const q = [];
      if (id) q.push('id=' + encodeURIComponent(id));
      if (sess) q.push('sess=' + encodeURIComponent(sess));
      return q.length ? url + '?' + q.join('&') : url;
    }
  };

  function captureCurrentContext(){
    const page = pathname();
    State.setLastPage(page);
    const qs = params();
    const pid = qs.get('id');
    const sess = qs.get('sess');
    if (page === 'protocol.html' && pid) State.setLastProtocol(pid, (document.referrer || '').split('/').pop() || 'protocol.html');
    if (page === 'player.html') {
      if (pid) State.setLastProtocol(pid, 'player.html');
      if (pid && sess) State.setContinueSession({ id: sess, protocolId: pid, progressPct: 0, startedAt: now() });
    }
    if (page === 'history.html' || page === 'favorites.html') State.syncFromSessions();
  }

  function wrapGlobal(name, wrapper){
    if (typeof window[name] !== 'function' || window[name]._mzWrapped) return;
    const orig = window[name];
    const wrapped = function(...args){ return wrapper(orig, this, args); };
    wrapped._mzWrapped = true;
    window[name] = wrapped;
  }

  function installWrappers(){
    wrapGlobal('goProtocol', (orig, ctx, args) => {
      const id = args[0];
      if (id) State.setLastProtocol(id, pathname());
      return orig.apply(ctx, args);
    });
    wrapGlobal('goToProtocol', (orig, ctx, args) => {
      const id = args[0];
      if (id) State.setLastProtocol(id, pathname());
      return orig.apply(ctx, args);
    });
    wrapGlobal('startSession', (orig, ctx, args) => {
      const id = args[0] || (window.currentProtocol && window.currentProtocol.id);
      if (id) State.setLastProtocol(id, pathname());
      const res = orig.apply(ctx, args);
      setTimeout(() => State.syncFromSessions(), 30);
      return res;
    });
    wrapGlobal('restartSession', (orig, ctx, args) => {
      const res = orig.apply(ctx, args);
      setTimeout(() => State.syncFromSessions(), 30);
      return res;
    });
    wrapGlobal('completeSession', (orig, ctx, args) => {
      const res = orig.apply(ctx, args);
      setTimeout(() => State.syncFromSessions(), 30);
      return res;
    });
  }

  function installClickCapture(){
    document.addEventListener('click', function(ev){
      const a = ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.includes('protocol.html?id=')) {
        const m = href.match(/[?&]id=([^&]+)/);
        if (m) State.setLastProtocol(decodeURIComponent(m[1]), pathname());
      }
      if (href.includes('player.html?id=')) {
        const idm = href.match(/[?&]id=([^&]+)/);
        const sm = href.match(/[?&]sess=([^&]+)/);
        if (idm) State.setLastProtocol(decodeURIComponent(idm[1]), pathname());
        if (idm && sm) State.setContinueSession({ id: decodeURIComponent(sm[1]), protocolId: decodeURIComponent(idm[1]), progressPct: 0, startedAt: now() });
      }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', function(){
    captureCurrentContext();
    installClickCapture();
    setTimeout(installWrappers, 20);
    setTimeout(() => State.syncFromSessions(), 60);
  });

  window.MazenState = State;
})(window);
