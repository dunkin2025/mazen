/**
 * ProtocolLibrary — Repository Pattern
 * Manages the protocol catalogue with cursor pagination.
 * Module: M-02
 */
class ProtocolLibrary {
  constructor() {
    this._protocols = [];
    this._collections = [];
    this._loaded = false;
  }

  async load() {
    if (this._loaded) return;
    try {
      const res = await fetch('data/protocols.json');
      const data = await res.json();
      this._protocols = data.protocols;
      this._collections = data.collections;
      this._loaded = true;
    } catch (e) {
      console.error('ProtocolLibrary: Failed to load data', e);
    }
  }

  /**
   * Query the protocol catalogue.
   * @param {Object} opts - { classification, season, access_tier, minDensity, maxDensity, cursor, limit, search }
   */
  query({ classification = null, season = null, access_tier = null,
          minDensity = 0, maxDensity = 1, cursor = null,
          limit = 12, search = '' } = {}) {

    let results = [...this._protocols].filter(p => {
      if (classification && p.classification !== classification) return false;
      if (season && p.season !== season) return false;
      if (access_tier && p.access_tier !== access_tier) return false;
      if (p.density_class < minDensity || p.density_class > maxDensity) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.title.toLowerCase().includes(q) ||
               p.classification.includes(q) ||
               p.season.includes(q) ||
               (p.spec_notes || '').toLowerCase().includes(q);
      }
      return true;
    });

    results.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));

    // Cursor pagination
    let startIdx = 0;
    if (cursor) {
      const idx = results.findIndex(p => p.id === cursor);
      if (idx !== -1) startIdx = idx + 1;
    }

    const page = results.slice(startIdx, startIdx + limit);
    const nextCursor = page.length === limit ? page[page.length - 1].id : null;

    return { results: page, nextCursor, total: results.length };
  }

  getById(id) {
    return this._protocols.find(p => p.id === id) || null;
  }

  getBySlug(slug) {
    return this._protocols.find(p => p.slug === slug) || null;
  }

  getCollections() {
    return [...this._collections].sort((a, b) => a.sort_order - b.sort_order);
  }

  getByCollection(collectionId) {
    return this._protocols
      .filter(p => p.collection_id === collectionId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  search(q) {
    return this.query({ search: q });
  }

  autocomplete(q) {
    if (!q || q.length < 2) return [];
    const lower = q.toLowerCase();
    const suggestions = [];

    this._protocols.forEach(p => {
      if (p.title.toLowerCase().includes(lower)) {
        suggestions.push({ type: 'protocol', label: p.title, id: p.id });
      }
    });

    const axisTerms = ['high_density', 'low_density', 'transitional', 'field_recording', 'seasonal', 'archival',
                       'winter', 'summer', 'spring', 'autumn', 'perennial'];
    axisTerms.filter(t => t.includes(lower)).forEach(t => {
      suggestions.push({ type: 'spec', label: t.replace('_', ' '), value: t });
    });

    return suggestions.slice(0, 6);
  }
}

// ═══════════════════════════════════════════════════════

/**
 * SessionLog — Observer Pattern
 * Append-only log of protocol session entries.
 * Module: M-09
 */
class SessionLog {
  constructor(practitionerId) {
    this._practitionerId = practitionerId;
    this._key = `mz_log_${practitionerId}`;
  }

  record({ protocolId, protocolTitle, startedAt, endedAt, completed,
           pctHeard, abandonPointS, tierAtTime }) {
    const entry = {
      id: 'log-' + crypto.randomUUID(),
      practitioner_id: this._practitionerId,
      protocol_id: protocolId,
      protocol_title: protocolTitle,
      started_at: startedAt,
      ended_at: endedAt || new Date().toISOString(),
      completed: !!completed,
      pct_heard: Math.min(1.0, Math.max(0, pctHeard || 0)),
      abandon_point_s: abandonPointS || null,
      tier_at_time: tierAtTime,
    };

    const log = this._load();
    log.push(entry);
    this._save(log);
    return entry;
  }

  getAll({ limit = 50, cursor = null } = {}) {
    const log = this._load().sort((a, b) =>
      new Date(b.started_at) - new Date(a.started_at)
    );

    let startIdx = 0;
    if (cursor) {
      const idx = log.findIndex(e => e.id === cursor);
      if (idx !== -1) startIdx = idx + 1;
    }

    const page = log.slice(startIdx, startIdx + limit);
    return { entries: page, nextCursor: page.length === limit ? page[page.length - 1].id : null, total: log.length };
  }

  getStats() {
    const log = this._load();
    const total = log.length;
    const completed = log.filter(e => e.completed).length;
    const completionRate = total ? (completed / total) : 0;
    const totalTime = log.reduce((acc, e) => {
      if (e.started_at && e.ended_at) {
        return acc + (new Date(e.ended_at) - new Date(e.started_at)) / 1000;
      }
      return acc;
    }, 0);

    return { total, completed, completionRate, totalTimeS: totalTime };
  }

  export() {
    const log = this._load();
    const csv = [
      'id,protocol_id,protocol_title,started_at,ended_at,completed,pct_heard,abandon_point_s,tier_at_time',
      ...log.map(e => [
        e.id, e.protocol_id, `"${e.protocol_title}"`,
        e.started_at, e.ended_at, e.completed,
        e.pct_heard?.toFixed(3), e.abandon_point_s || '',
        e.tier_at_time
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mazen-session-log-${this._practitionerId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch { return []; }
  }

  _save(log) {
    localStorage.setItem(this._key, JSON.stringify(log));
  }
}

// ═══════════════════════════════════════════════════════

/**
 * MembershipService — Service Layer
 * Manages trial + membership state. Simulates Stripe billing.
 * Module: M-06
 */
class MembershipService {
  constructor(practitioner) {
    this._practitioner = practitioner;
  }

  getStatus() {
    const tier = this._practitioner.tier;
    const trialing = this._practitioner.isTrialing;
    const daysLeft = this._practitioner.trialDaysLeft;

    return {
      tier,
      trialing,
      daysLeft,
      canUpgrade: tier === 'observer' && !trialing,
      label: trialing
        ? `Trial — ${daysLeft}d remaining`
        : tier === 'practitioner' ? 'Active membership'
        : tier === 'studio' ? 'Studio tier — active'
        : 'Observer access',
    };
  }

  /**
   * Simulate Stripe Checkout redirect.
   * In production: POST /api/billing/checkout → redirect to Stripe.
   */
  async initiateCheckout(tier = 'practitioner') {
    // Prototype: directly upgrade for demo purposes
    const confirm = window.confirm(
      `MA-ZEN Protocol Access\n\nPractitioner Membership — £9.99/month\n\n` +
      `This would redirect to Stripe Checkout in production.\n\n` +
      `Simulate activation?`
    );
    if (confirm) {
      this._practitioner.upgradeTier(tier);
      return { success: true };
    }
    return { success: false };
  }

  cease() {
    const confirm = window.confirm(
      'Cease membership?\n\nYour access will end at the current period end.'
    );
    if (confirm) {
      this._practitioner.upgradeTier('observer');
      return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════

/**
 * AccessProtocol — Policy Object
 * Governs entry to protocol sessions.
 * Module: M-05
 */
class AccessProtocol {
  constructor(practitioner) {
    this._practitioner = practitioner;
  }

  can(requiredTier) {
    return this._practitioner.can(requiredTier);
  }

  enforce(protocol) {
    if (!this.can(protocol.access_tier)) {
      return {
        allowed: false,
        reason: protocol.access_tier === 'practitioner'
          ? 'Practitioner membership required for this protocol.'
          : 'Studio tier required for this protocol.',
        upgradeRequired: true,
      };
    }
    return { allowed: true };
  }

  audit(protocolId, action) {
    const log = JSON.parse(localStorage.getItem('mz_access_audit') || '[]');
    log.push({
      ts: new Date().toISOString(),
      practitioner_id: this._practitioner.id,
      protocol_id: protocolId,
      action,
      tier: this._practitioner.tier,
    });
    localStorage.setItem('mz_access_audit', JSON.stringify(log.slice(-500)));
  }
}

// ═══════════════════════════════════════════════════════

/**
 * StudioCMS — Command Pattern (simplified for prototype)
 * Module: M-08
 */
class StudioCMS {
  constructor() {
    this._key = 'mz_studio_commands';
  }

  execute(operatorId, commandType, targetEntity, targetId, payload, notes = '') {
    const cmd = {
      id: 'cmd-' + crypto.randomUUID(),
      operator_id: operatorId,
      command_type: commandType,
      target_entity: targetEntity,
      target_id: targetId,
      payload_json: payload,
      executed_at: new Date().toISOString(),
      reversed_at: null,
      reversed_by: null,
      notes,
    };

    const log = this._load();
    log.push(cmd);
    this._save(log);
    return cmd;
  }

  reverse(commandId, operatorId) {
    const log = this._load();
    const idx = log.findIndex(c => c.id === commandId);
    if (idx === -1) throw new Error('Command not found.');
    if (log[idx].reversed_at) throw new Error('Command already reversed.');
    log[idx].reversed_at = new Date().toISOString();
    log[idx].reversed_by = operatorId;
    this._save(log);
    return log[idx];
  }

  getLog({ limit = 50 } = {}) {
    return this._load()
      .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))
      .slice(0, limit);
  }

  _load() { try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch { return []; } }
  _save(d) { localStorage.setItem(this._key, JSON.stringify(d)); }
}

// ─── Exports ──────────────────────────────────────────────────
window.ProtocolLibrary = ProtocolLibrary;
window.SessionLog = SessionLog;
window.MembershipService = MembershipService;
window.AccessProtocol = AccessProtocol;
window.StudioCMS = StudioCMS;
