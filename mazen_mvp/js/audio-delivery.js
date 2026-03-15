/* MA-ZEN — audio-delivery.js  (Module 18: Audio Delivery / CDN)
   Provides: AudioDeliveryModule
   Signed URL simulation, asset registry, preload strategy, format management
   Real CDN: Cloudflare R2 + signed URLs. GitHub Pages: simulates the contract.
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  /* ── CDN CONFIG ── */
  const CDN_BASE    = 'https://assets.ma-zen.io'; // Replace with R2 public URL
  const SIGNED_TTL  = 3600; // 1 hour
  const FORMATS     = ['mp3', 'aac']; // HLS pending
  const KEY         = 'mz:audio-registry';

  /* ── ASSET REGISTRY: maps layer IDs → file paths ── */
  const BUILT_IN_ASSETS = {
    /* Noise synthesis fallbacks (Web Audio API generated) */
    'noise:brown':      { type: 'synthesis', params: { kind: 'brown', freq: 200, gain: 0.3 } },
    'noise:pink':       { type: 'synthesis', params: { kind: 'pink',  freq: 400, gain: 0.25 } },
    'noise:white':      { type: 'synthesis', params: { kind: 'white', freq: 800, gain: 0.2 } },

    /* Field layer stubs — real files would be on CDN */
    'winter-field-01':  { type: 'cdn', path: '/field/winter-01.mp3', duration_sec: 300 },
    'winter-field-02':  { type: 'cdn', path: '/field/winter-02.mp3', duration_sec: 300 },
    'spring-field-01':  { type: 'cdn', path: '/field/spring-01.mp3', duration_sec: 300 },
    'spring-field-02':  { type: 'cdn', path: '/field/spring-02.mp3', duration_sec: 300 },
    'summer-field-01':  { type: 'cdn', path: '/field/summer-01.mp3', duration_sec: 300 },
    'autumn-field-01':  { type: 'cdn', path: '/field/autumn-01.mp3', duration_sec: 300 },

    /* Texture layer stubs */
    'stone-breath':     { type: 'cdn', path: '/texture/stone-breath.mp3', duration_sec: 60 },
    'ice-resonance':    { type: 'cdn', path: '/texture/ice-resonance.mp3', duration_sec: 60 },
    'wind-scatter':     { type: 'cdn', path: '/texture/wind-scatter.mp3', duration_sec: 60 },
    'light-scatter':    { type: 'cdn', path: '/texture/light-scatter.mp3', duration_sec: 60 },
    'heat-shimmer':     { type: 'cdn', path: '/texture/heat-shimmer.mp3', duration_sec: 60 },
    'dry-resonance':    { type: 'cdn', path: '/texture/dry-resonance.mp3', duration_sec: 60 },
  };

  /* ── SIGNED URL SIMULATION ── */
  function _sign(path, ttl) {
    // In production: HMAC-SHA256 with R2 secret + expiry
    // Simulation: encode path + expiry in base64
    const expiry = Date.now() + (ttl * 1000);
    const token  = btoa(`${path}:${expiry}`);
    return `${CDN_BASE}${path}?token=${token}&exp=${expiry}`;
  }

  function _verifyToken(token, path) {
    try {
      const decoded = atob(token);
      const [dPath, expiry] = decoded.split(':');
      return dPath === path && Date.now() < parseInt(expiry);
    } catch { return false; }
  }

  /* ── PRELOAD CACHE ── */
  const _cache = new Map();

  const AudioDeliveryModule = {

    /* ── GET SIGNED URL ── */
    getSignedUrl(assetId, format = 'mp3') {
      const asset = BUILT_IN_ASSETS[assetId];
      if (!asset) return null;
      if (asset.type === 'synthesis') return { type: 'synthesis', params: asset.params };

      const path = asset.path.replace('.mp3', `.${format}`);
      return { type: 'cdn', url: _sign(path, SIGNED_TTL), expires_at: Date.now() + SIGNED_TTL * 1000 };
    },

    /* ── VERIFY URL IS STILL VALID ── */
    verifyUrl(url) {
      try {
        const u     = new URL(url);
        const token = u.searchParams.get('token');
        const exp   = parseInt(u.searchParams.get('exp') || '0');
        return Date.now() < exp;
      } catch { return false; }
    },

    /* ── PRELOAD ASSETS FOR A PROTOCOL ── */
    async preloadProtocol(protocolId) {
      const db = window.MAZEN_DB;
      if (!db) return;
      const p = db.getProtocolById(protocolId);
      if (!p || !p.layer_config) return;

      const layers = [p.layer_config.field, p.layer_config.texture].filter(Boolean);
      const promises = layers.map(async layerId => {
        if (_cache.has(layerId)) return;
        const ref = this.getSignedUrl(layerId);
        if (!ref) return;
        if (ref.type === 'synthesis') {
          _cache.set(layerId, { type: 'synthesis', params: ref.params, ready: true });
          return;
        }
        // In production: fetch HEAD to warm CDN edge, or preload with <link rel=preload>
        _cache.set(layerId, { type: 'cdn', url: ref.url, ready: true });
      });

      await Promise.allSettled(promises);
      return { protocolId, layers_cached: layers.length };
    },

    /* ── GET ASSET (from cache or fresh) ── */
    getAsset(assetId) {
      if (_cache.has(assetId)) {
        const cached = _cache.get(assetId);
        if (cached.type === 'synthesis') return cached;
        if (this.verifyUrl(cached.url)) return cached;
        // URL expired — refresh
        _cache.delete(assetId);
      }
      const ref = this.getSignedUrl(assetId);
      if (ref && ref.type === 'cdn') _cache.set(assetId, { ...ref, ready: true });
      return ref;
    },

    /* ── LIST ALL ASSETS ── */
    getRegistry() {
      const custom = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
      return { ...BUILT_IN_ASSETS, ...custom };
    },

    /* ── REGISTER CUSTOM ASSET (admin upload stub) ── */
    registerAsset(id, assetDef) {
      const registry = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
      registry[id] = assetDef;
      localStorage.setItem(KEY, JSON.stringify(registry));
    },

    /* ── RENDER STATUS PANEL (admin) ── */
    renderStatusPanel(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const registry = this.getRegistry();
      const entries  = Object.entries(registry);
      const cdn_count  = entries.filter(([,v]) => v.type === 'cdn').length;
      const synth_count= entries.filter(([,v]) => v.type === 'synthesis').length;

      container.innerHTML = `
        <div class="cdn-panel">
          <div class="cdn-header">
            <span class="cdn-eyebrow">AUDIO DELIVERY</span>
            <h2 class="cdn-title">Asset <em>Registry</em></h2>
          </div>

          <div class="cdn-stats">
            <div class="cdn-stat"><span>${entries.length}</span><small>TOTAL ASSETS</small></div>
            <div class="cdn-stat"><span>${cdn_count}</span><small>CDN ASSETS</small></div>
            <div class="cdn-stat"><span>${synth_count}</span><small>SYNTHESIS</small></div>
            <div class="cdn-stat"><span>${_cache.size}</span><small>CACHED</small></div>
          </div>

          <div class="cdn-config">
            <div class="cdn-config-row"><span class="cdn-config-label">CDN BASE</span><code class="cdn-code">${CDN_BASE}</code></div>
            <div class="cdn-config-row"><span class="cdn-config-label">TOKEN TTL</span><code class="cdn-code">${SIGNED_TTL}s</code></div>
            <div class="cdn-config-row"><span class="cdn-config-label">FORMATS</span><code class="cdn-code">${FORMATS.join(', ')}</code></div>
            <div class="cdn-config-row"><span class="cdn-config-label">STATUS</span><code class="cdn-code cdn-status-sim">SIMULATED (localStorage)</code></div>
          </div>

          <div class="cdn-asset-list">
            <div class="cdn-asset-header">
              <span>ASSET ID</span><span>TYPE</span><span>PATH / CONFIG</span>
            </div>
            ${entries.map(([id, a]) => `
              <div class="cdn-asset-row">
                <span class="cdn-asset-id">${id}</span>
                <span class="cdn-asset-type cdn-type-${a.type}">${a.type}</span>
                <span class="cdn-asset-path">${a.path || (a.params ? JSON.stringify(a.params) : '—')}</span>
              </div>`).join('')}
          </div>

          <div class="cdn-migration-note">
            <span class="cdn-note-label">MIGRATION NOTE</span>
            <p>Replace <code>CDN_BASE</code> with Cloudflare R2 public URL. Replace <code>_sign()</code> with server-side HMAC signing (Cloudflare Worker or Edge Function). HLS manifest generation: R2 + ffmpeg pipeline.</p>
          </div>
        </div>`;
    }
  };

  window.AudioDeliveryModule = AudioDeliveryModule;
})(window);
