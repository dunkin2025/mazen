/**
 * SilenceEngine — MA-ZEN WebAudio Protocol Engine
 * Singleton class. Governs acoustic conditions of a protocol session.
 * This is NOT a music player. It synthesises and governs governed silence structures.
 *
 * OOP Pattern: Singleton + Strategy
 * Module: M-01
 */

class SilenceEngine {
  static _instance = null;

  static getInstance() {
    if (!SilenceEngine._instance) {
      SilenceEngine._instance = new SilenceEngine();
    }
    return SilenceEngine._instance;
  }

  constructor() {
    if (SilenceEngine._instance) return SilenceEngine._instance;

    this._ctx = null;
    this._masterGain = null;
    this._densityGain = null;
    this._noiseSource = null;
    this._referenceOsc = null;
    this._referenceGain = null;
    this._filterNode = null;

    this._state = 'idle'; // idle | active | paused
    this._currentProtocol = null;
    this._densityClass = 0.5;
    this._startTime = 0;
    this._pausedAt = 0;

    this._onStateChange = null;
    this._onProgress = null;
    this._progressInterval = null;

    SilenceEngine._instance = this;
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Initialise the protocol session.
   * @param {Object} protocol - ProtocolSession spec
   * @param {number} densityOverride - Optional density override (0.0–1.0)
   */
  async initProtocol(protocol, densityOverride = null) {
    this._ensureContext();
    await this._ctx.resume();

    this._currentProtocol = protocol;
    this._densityClass = densityOverride ?? protocol.density_class;
    this._state = 'active';
    this._startTime = this._ctx.currentTime;
    this._pausedAt = 0;

    this._buildSignalChain();
    this._startProgressTracking();

    if (this._onStateChange) this._onStateChange('active', protocol);
  }

  /**
   * Pause the session.
   */
  pause() {
    if (this._state !== 'active') return;
    this._pausedAt = this._elapsed();
    this._teardownSignalChain();
    this._stopProgressTracking();
    this._state = 'paused';
    if (this._onStateChange) this._onStateChange('paused', this._currentProtocol);
  }

  /**
   * Resume from paused state.
   */
  async resume() {
    if (this._state !== 'paused') return;
    await this._ctx.resume();
    this._startTime = this._ctx.currentTime - this._pausedAt;
    this._buildSignalChain();
    this._startProgressTracking();
    this._state = 'active';
    if (this._onStateChange) this._onStateChange('active', this._currentProtocol);
  }

  /**
   * Terminate the session. Logs completion.
   */
  terminate(complete = false) {
    this._teardownSignalChain();
    this._stopProgressTracking();
    const elapsed = this._elapsed();
    this._state = 'idle';
    const protocol = this._currentProtocol;
    this._currentProtocol = null;
    if (this._onStateChange) this._onStateChange('idle', protocol, { elapsed, complete });
    return { elapsed, complete };
  }

  /**
   * Adjust density specification in real-time.
   * @param {number} value - 0.0 to 1.0
   */
  applyDensity(value) {
    this._densityClass = Math.max(0.0, Math.min(1.0, value));
    if (this._densityGain && this._state === 'active') {
      const target = this._densityToGain(this._densityClass);
      this._densityGain.gain.setTargetAtTime(target, this._ctx.currentTime, 0.3);
    }
  }

  /**
   * Calibrate reference tone frequency.
   * @param {number} hz - Reference frequency (default 432)
   */
  calibrate(hz = 432) {
    if (this._referenceOsc) {
      this._referenceOsc.frequency.setTargetAtTime(hz, this._ctx.currentTime, 0.5);
    }
  }

  get state() { return this._state; }
  get densityClass() { return this._densityClass; }
  get elapsed() { return this._elapsed(); }

  get progress() {
    if (!this._currentProtocol) return 0;
    return Math.min(1.0, this._elapsed() / this._currentProtocol.duration_s);
  }

  onStateChange(fn) { this._onStateChange = fn; }
  onProgress(fn)    { this._onProgress = fn; }

  // ─── Private Methods ──────────────────────────────────────────

  _ensureContext() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.6;
      this._masterGain.connect(this._ctx.destination);
    }
  }

  _buildSignalChain() {
    this._teardownSignalChain();

    const ctx = this._ctx;
    const density = this._densityClass;

    // Density-controlled gain node
    this._densityGain = ctx.createGain();
    this._densityGain.gain.value = this._densityToGain(density);

    // Low-pass filter — sculpts the noise character
    this._filterNode = ctx.createBiquadFilter();
    this._filterNode.type = 'lowpass';
    this._filterNode.frequency.value = 400 + (density * 800);
    this._filterNode.Q.value = 0.7;

    // White noise source
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }
    }

    this._noiseSource = ctx.createBufferSource();
    this._noiseSource.buffer = buffer;
    this._noiseSource.loop = true;

    // Reference tone oscillator (sub-perceptual at low gain)
    this._referenceOsc = ctx.createOscillator();
    this._referenceOsc.type = 'sine';
    this._referenceOsc.frequency.value = 432;

    this._referenceGain = ctx.createGain();
    this._referenceGain.gain.value = density * 0.015; // Sub-perceptual

    // Signal chain: noise → filter → densityGain → master
    this._noiseSource.connect(this._filterNode);
    this._filterNode.connect(this._densityGain);
    this._densityGain.connect(this._masterGain);

    // Reference: osc → refGain → master
    this._referenceOsc.connect(this._referenceGain);
    this._referenceGain.connect(this._masterGain);

    // Fade in
    this._masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this._masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);

    this._noiseSource.start();
    this._referenceOsc.start();
  }

  _teardownSignalChain() {
    const safeStop = (node) => {
      try { if (node) node.stop(); } catch(e) {}
    };
    const safeDisconnect = (node) => {
      try { if (node) node.disconnect(); } catch(e) {}
    };

    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.5);
    }

    setTimeout(() => {
      safeStop(this._noiseSource);
      safeStop(this._referenceOsc);
      safeDisconnect(this._noiseSource);
      safeDisconnect(this._referenceOsc);
      safeDisconnect(this._filterNode);
      safeDisconnect(this._densityGain);
      safeDisconnect(this._referenceGain);
      this._noiseSource = null;
      this._referenceOsc = null;
      this._filterNode = null;
      this._densityGain = null;
      this._referenceGain = null;
    }, 600);
  }

  _densityToGain(density) {
    // Maps 0.0–1.0 density to perceptually appropriate gain curve
    return Math.pow(density, 2) * 0.35 + 0.02;
  }

  _elapsed() {
    if (!this._ctx) return 0;
    if (this._state === 'paused') return this._pausedAt;
    if (this._state === 'idle') return 0;
    return this._ctx.currentTime - this._startTime;
  }

  _startProgressTracking() {
    this._progressInterval = setInterval(() => {
      if (this._onProgress) {
        this._onProgress(this._elapsed(), this.progress);
      }
      // Auto-complete
      if (this._currentProtocol && this._elapsed() >= this._currentProtocol.duration_s) {
        this.terminate(true);
      }
    }, 500);
  }

  _stopProgressTracking() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
  }
}

// Export singleton
window.SilenceEngine = SilenceEngine;
