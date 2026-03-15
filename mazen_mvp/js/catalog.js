/* MA-ZEN — catalog.js  (CatalogModule)
   Provides: CatalogModule
   Handles protocol grid rendering and filter controls
---------------------------------------------------------------------- */
(function(window) {
  'use strict';

  const OUTCOME_COLORS = {
    FOCUS:        'var(--outcome-focus,#C4944A)',
    DECOMPRESSION:'var(--outcome-decomp,#7BA8C0)',
    RESET:        'var(--outcome-reset,#C09878)',
    TRANSITION:   'var(--outcome-transition,#8BA87B)',
    REFLECTION:   'var(--outcome-reflection,#9E8BBB)'
  };

  let _state = {
    containerId: null,
    protocols: {},
    onSelect: null,
    filters: { outcome: 'ALL', season: 'ALL', search: '' },
    sort: 'default'
  };

  const CatalogModule = {

    /* ── INIT ── */
    async init({ containerId, protocols, onSelect }) {
      _state.containerId = containerId;
      _state.protocols   = protocols || {};
      _state.onSelect    = onSelect || (() => {});

      // Accept both {id: obj} map and array
      if (Array.isArray(protocols)) {
        _state.protocols = protocols.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
      }

      return this;
    },

    /* ── SET FILTER ── */
    setFilter(key, val) {
      _state.filters[key] = val;
    },

    /* ── GET FILTERED PROTOCOLS ── */
    _getFiltered() {
      let list = Object.values(_state.protocols);
      const f = _state.filters;

      if (f.outcome && f.outcome !== 'ALL') {
        list = list.filter(p => (p.outcome || '').toUpperCase() === f.outcome);
      }
      if (f.season && f.season !== 'ALL') {
        const s = f.season.toLowerCase();
        list = list.filter(p => {
          const seasons = p.seasons || [];
          return seasons.some(ps => ps.toLowerCase() === s) || (p.season || '').toLowerCase() === s;
        });
      }
      if (f.search) {
        const q = f.search.toLowerCase();
        list = list.filter(p =>
          (p.name || p.romanji || '').toLowerCase().includes(q) ||
          (p.kanji || p.title || '').includes(q) ||
          (p.subtitle || '').toLowerCase().includes(q)
        );
      }
      return list;
    },

    /* ── RENDER GRID ── */
    renderGrid() {
      const container = document.getElementById(_state.containerId);
      if (!container) return;

      const list = this._getFiltered();
      const count = document.getElementById('catalog-count');
      if (count) count.textContent = list.length;

      if (list.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--type-faint);font-size:.65rem">No protocols match your filters.</div>`;
        return;
      }

      container.innerHTML = list.map((p, i) => {
        const id = p.id;
        const kanji = p.kanji || p.title || '';
        const name  = p.name  || p.romanji || id;
        const sub   = p.subtitle || '';
        const oc    = (p.outcome || 'FOCUS').toUpperCase();
        const color = OUTCOME_COLORS[oc] || OUTCOME_COLORS.FOCUS;
        const dur   = p.durations ? p.durations.join('–') + ' min' : (p.duration_min ? p.duration_min + ' min' : '');
        const whenArr = (p.whenToUse || p.when || p.for || []).slice(0,2);
        const isLocked = !EntitlementEngine.checkProtocol(id);

        return `<div class="protocol-card ${isLocked ? 'locked' : ''}" 
                     data-id="${id}" data-outcome="${oc}"
                     style="animation-delay:${i * 0.04}s"
                     tabindex="0" role="button">
          <div class="card-top">
            <div class="card-kanji">${kanji}</div>
            ${isLocked ? '<span class="lock-badge">THE FLOOR</span>' : `<span class="outcome-badge" data-outcome="${oc}">${oc}</span>`}
          </div>
          <div class="card-name">${name}</div>
          <div class="card-subtitle">${sub}</div>
          ${whenArr.length ? `<div class="card-when-label">USE WHEN</div><div class="card-when">${whenArr[0]}</div>` : ''}
          <div class="card-footer">
            <div class="card-materials"></div>
            <div class="card-durs">${dur}</div>
          </div>
          <div class="card-arrow">→</div>
          ${isLocked ? '<div class="card-lock-icon">⌒</div>' : ''}
        </div>`;
      }).join('');

      // Bind clicks
      container.querySelectorAll('.protocol-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => {
          const p = _state.protocols[card.dataset.id];
          if (p && _state.onSelect) _state.onSelect(p);
        });
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') card.click();
        });
      });
    },

    /* ── RENDER FILTER CONTROLS ── */
    async renderFilterControls(containerId, onChange) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const outcomes = ['ALL', 'FOCUS', 'DECOMPRESSION', 'RESET', 'TRANSITION', 'REFLECTION'];
      const seasons  = ['ALL', 'WINTER', 'SPRING', 'SUMMER', 'AUTUMN', 'EXPERIMENTAL'];

      container.innerHTML = `
        <div class="filter-section">
          <span class="filter-section-label">OUTCOME</span>
          ${outcomes.map(oc => `
            <div class="filter-option ${oc === 'ALL' ? 'active' : ''}" data-filter="outcome" data-val="${oc}">
              <div class="filter-dot"></div>
              <span>${oc}</span>
            </div>`).join('')}
        </div>
        <div class="filter-section">
          <span class="filter-section-label">SEASON</span>
          ${seasons.map(s => `
            <div class="filter-option ${s === 'ALL' ? 'active' : ''}" data-filter="season" data-val="${s}">
              <div class="filter-dot"></div>
              <span>${s}</span>
            </div>`).join('')}
        </div>
        <div class="filter-section">
          <span class="filter-clear" id="catalog-filter-clear">CLEAR FILTERS</span>
        </div>`;

      container.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const filterKey = opt.dataset.filter;
          // Deactivate siblings
          container.querySelectorAll(`.filter-option[data-filter="${filterKey}"]`).forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          _state.filters[filterKey] = opt.dataset.val;
          if (onChange) onChange();
          else this.renderGrid();
        });
      });

      container.querySelector('#catalog-filter-clear')?.addEventListener('click', () => {
        _state.filters = { outcome: 'ALL', season: 'ALL', search: '' };
        container.querySelectorAll('.filter-option').forEach(o => {
          o.classList.toggle('active', o.dataset.val === 'ALL');
        });
        if (onChange) onChange();
        else this.renderGrid();
      });
    },

    /* ── RENDER METADATA (for detail drawers) ── */
    renderMetadata(protocolId, containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const p = _state.protocols[protocolId];
      if (!p) { container.innerHTML = ''; return; }

      const dur  = p.durations ? p.durations.map(d => d + ' min').join(' · ') : '';
      const sil  = p.defaultSilence || Math.round((p.silenceDensity || p.silence_density || 0) * 100);
      const seasons = (p.seasons || [p.season]).map(s => `<span class="catalog-dur-option">${(s||'').toUpperCase()}</span>`).join(' ');

      container.innerHTML = `
        <div class="catalog-meta-row">
          <span class="catalog-meta-label">DURATION</span>
          <span class="catalog-meta-val">${dur}</span>
        </div>
        <div class="catalog-meta-row">
          <span class="catalog-meta-label">SILENCE</span>
          <span class="catalog-meta-val">${sil}%</span>
        </div>
        <div class="catalog-meta-row">
          <span class="catalog-meta-label">SEASON</span>
          <span class="catalog-meta-val">${seasons}</span>
        </div>`;
    }
  };

  window.CatalogModule = CatalogModule;
})(window);
