/**
 * Practitioner — Account Aggregate Root
 * Manages auth state, tier, calibration, and session history.
 * Simulates JWT auth via localStorage for prototype.
 *
 * OOP Pattern: Aggregate Root
 * Module: M-04
 */

class Practitioner {
  constructor() {
    this._state = this._loadState();
    this._listeners = [];
  }

  // ─── Auth ─────────────────────────────────────────────────────

  register(email, password, name = '') {
    const existing = this._getAllPractitioners().find(p => p.email === email);
    if (existing) throw new Error('Email already registered.');

    const id = 'prac-' + crypto.randomUUID();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const record = {
      id, email, name,
      password_hash: this._hash(password),
      tier: 'observer',
      trial_ends_at: trialEnd.toISOString(),
      access_ends_at: null,
      calibration_json: { default_density: 0.5, preferred_classification: [] },
      pref_density: 0.5,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const all = this._getAllPractitioners();
    all.push(record);
    localStorage.setItem('mz_practitioners', JSON.stringify(all));

    this._setState({ ...record, authenticated: true });
    return record;
  }

  login(email, password) {
    const record = this._getAllPractitioners().find(p => p.email === email);
    if (!record) throw new Error('No account found for this email.');
    if (record.password_hash !== this._hash(password)) throw new Error('Incorrect password.');
    if (!record.is_active) throw new Error('This account is inactive.');

    this._setState({ ...record, authenticated: true });
    return record;
  }

  logout() {
    this._setState({ authenticated: false });
    this._notify();
  }

  get isAuthenticated() { return !!this._state?.authenticated; }
  get id() { return this._state?.id || null; }
  get email() { return this._state?.email || null; }
  get name() { return this._state?.name || 'Practitioner'; }
  get tier() { return this._state?.tier || 'observer'; }
  get prefDensity() { return this._state?.pref_density ?? 0.5; }
  get calibration() { return this._state?.calibration_json || {}; }

  get isTrialing() {
    if (!this._state?.trial_ends_at) return false;
    return new Date(this._state.trial_ends_at) > new Date();
  }

  get trialDaysLeft() {
    if (!this._state?.trial_ends_at) return 0;
    const diff = new Date(this._state.trial_ends_at) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // ─── Access Control ───────────────────────────────────────────

  /**
   * Check if the practitioner can access a protocol at the given tier.
   */
  can(requiredTier) {
    const hierarchy = { observer: 0, practitioner: 1, studio: 2 };
    const myLevel = hierarchy[this.tier] ?? 0;
    const reqLevel = hierarchy[requiredTier] ?? 0;

    // Trialing practitioners get practitioner access
    if (this.isTrialing && myLevel < 1 && reqLevel <= 1) return true;
    return myLevel >= reqLevel;
  }

  // ─── Preferences ─────────────────────────────────────────────

  updatePrefs(prefs) {
    if (!this.isAuthenticated) return;
    const updated = { ...this._state, ...prefs };
    this._setState(updated);
    this._persistCurrentPractitioner(updated);
    this._notify();
  }

  setCalibration(calibData) {
    if (!this.isAuthenticated) return;
    const updated = { ...this._state, calibration_json: { ...this.calibration, ...calibData } };
    this._setState(updated);
    this._persistCurrentPractitioner(updated);
    this._notify();
  }

  // ─── Tier Management (simulated) ─────────────────────────────

  upgradeTier(tier) {
    if (!this.isAuthenticated) return;
    const validTiers = ['observer', 'practitioner', 'studio'];
    if (!validTiers.includes(tier)) return;
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    const updated = { ...this._state, tier, access_ends_at: end.toISOString() };
    this._setState(updated);
    this._persistCurrentPractitioner(updated);
    this._notify();
  }

  // ─── Subscription ─────────────────────────────────────────────

  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  // ─── Private ─────────────────────────────────────────────────

  _hash(str) {
    // Simple hash for prototype — NOT for production
    let h = 0;
    for (const c of str) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
    return 'hash_' + Math.abs(h).toString(16);
  }

  _getAllPractitioners() {
    try { return JSON.parse(localStorage.getItem('mz_practitioners') || '[]'); } catch { return []; }
  }

  _persistCurrentPractitioner(data) {
    const all = this._getAllPractitioners();
    const idx = all.findIndex(p => p.id === data.id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...data };
      localStorage.setItem('mz_practitioners', JSON.stringify(all));
    }
  }

  _loadState() {
    try { return JSON.parse(sessionStorage.getItem('mz_session') || 'null'); } catch { return null; }
  }

  _setState(state) {
    this._state = state;
    if (state?.authenticated) {
      sessionStorage.setItem('mz_session', JSON.stringify(state));
    } else {
      sessionStorage.removeItem('mz_session');
    }
    this._notify();
  }

  _notify() {
    this._listeners.forEach(fn => fn(this._state));
  }
}

window.Practitioner = Practitioner;
