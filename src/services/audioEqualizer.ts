/**
 * Web Audio API Equalizer and Dynamics Engine for Offline Media Vault.
 * Provides a 10-band parametric EQ, preset management, and real-time volume normalizer.
 */

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export type EQPresetKey = 'plano' | 'bass_boost' | 'vocal' | 'rock' | 'pop' | 'treble' | 'custom';

export interface EQPreset {
  name: string;
  gains: number[]; // dB values from -12 to +12 for the 10 bands
}

export const EQ_PRESETS: Record<EQPresetKey, EQPreset> = {
  plano: {
    name: 'Plano (Flat)',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  bass_boost: {
    name: 'Graves (Bass Boost)',
    gains: [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  },
  vocal: {
    name: 'Voz / Podcast',
    gains: [-3, -2, 0, 3, 5, 5, 4, 2, 0, -1],
  },
  rock: {
    name: 'Rock',
    gains: [5, 4, 2, 0, -1, 0, 2, 4, 5, 5],
  },
  pop: {
    name: 'Pop',
    gains: [-1, 2, 4, 5, 3, 0, -1, -1, 2, 4],
  },
  treble: {
    name: 'Agudos (Treble Boost)',
    gains: [0, 0, 0, 0, 0, 2, 4, 6, 7, 8],
  },
  custom: {
    name: 'Personalizado',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

const STORAGE_KEY_EQ_GAINS = 'omv_eq_gains';
const STORAGE_KEY_EQ_PRESET = 'omv_eq_preset';
const STORAGE_KEY_EQ_ENABLED = 'omv_eq_enabled';
const STORAGE_KEY_NORMALIZE_ENABLED = 'omv_normalize_enabled';

class AudioEqualizerEngine {
  private audioCtx: AudioContext | null = null;
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private filters: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode | null = null;
  private activeElement: HTMLMediaElement | null = null;

  private gains: number[] = [...EQ_PRESETS.plano.gains];
  private currentPreset: EQPresetKey = 'plano';
  private eqEnabled: boolean = true;
  private normalizeEnabled: boolean = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const savedPreset = localStorage.getItem(STORAGE_KEY_EQ_PRESET) as EQPresetKey;
      if (savedPreset && EQ_PRESETS[savedPreset]) {
        this.currentPreset = savedPreset;
      }

      const savedGains = localStorage.getItem(STORAGE_KEY_EQ_GAINS);
      if (savedGains) {
        const parsed = JSON.parse(savedGains);
        if (Array.isArray(parsed) && parsed.length === 10) {
          this.gains = parsed;
        }
      } else if (this.currentPreset && EQ_PRESETS[this.currentPreset]) {
        this.gains = [...EQ_PRESETS[this.currentPreset].gains];
      }

      const savedEqEnabled = localStorage.getItem(STORAGE_KEY_EQ_ENABLED);
      if (savedEqEnabled !== null) {
        this.eqEnabled = savedEqEnabled === 'true';
      }

      const savedNormalizeEnabled = localStorage.getItem(STORAGE_KEY_NORMALIZE_ENABLED);
      if (savedNormalizeEnabled !== null) {
        this.normalizeEnabled = savedNormalizeEnabled === 'true';
      }
    } catch (e) {
      console.warn('[AudioEqualizer] Error loading saved settings:', e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_EQ_PRESET, this.currentPreset);
      localStorage.setItem(STORAGE_KEY_EQ_GAINS, JSON.stringify(this.gains));
      localStorage.setItem(STORAGE_KEY_EQ_ENABLED, String(this.eqEnabled));
      localStorage.setItem(STORAGE_KEY_NORMALIZE_ENABLED, String(this.normalizeEnabled));
    } catch (e) {
      console.warn('[AudioEqualizer] Error saving settings:', e);
    }
  }

  /**
   * Connects a media element (HTMLAudioElement or HTMLVideoElement) to the Web Audio Equalizer pipeline.
   */
  public attachMediaElement(element: HTMLMediaElement) {
    if (!element || this.activeElement === element) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      let sourceNode = this.sourceMap.get(element);
      if (!sourceNode) {
        element.crossOrigin = 'anonymous';
        sourceNode = this.audioCtx.createMediaElementSource(element);
        this.sourceMap.set(element, sourceNode);
      }

      // Rebuild nodes graph
      sourceNode.disconnect();
      this.buildGraph(sourceNode);
      this.activeElement = element;
    } catch (err) {
      console.warn('[AudioEqualizer] Failed to attach media element:', err);
    }
  }

  private buildGraph(sourceNode: MediaElementAudioSourceNode) {
    if (!this.audioCtx) return;

    // Create 10 Biquad Filters
    this.filters = EQ_FREQUENCIES.map((freq, index) => {
      const filter = this.audioCtx!.createBiquadFilter();

      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }

      filter.frequency.value = freq;
      filter.gain.value = this.eqEnabled ? this.gains[index] : 0;
      return filter;
    });

    // Create Compressor for Volume Normalization (EBU R128 autoleveling approximation)
    this.compressorNode = this.audioCtx.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 12;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;

    // Chain nodes: source -> filter0 -> filter1 -> ... -> filter9 -> (compressor) -> destination
    let current: AudioNode = sourceNode;
    for (const filter of this.filters) {
      current.connect(filter);
      current = filter;
    }

    if (this.normalizeEnabled && this.compressorNode) {
      current.connect(this.compressorNode);
      this.compressorNode.connect(this.audioCtx.destination);
    } else {
      current.connect(this.audioCtx.destination);
    }
  }

  /**
   * Set gain for a specific band index (0 to 9) in dB (-12 to +12)
   */
  public setBandGain(bandIndex: number, gainDb: number) {
    if (bandIndex < 0 || bandIndex >= this.gains.length) return;
    const clampedGain = Math.max(-12, Math.min(12, gainDb));
    this.gains[bandIndex] = clampedGain;
    this.currentPreset = 'custom';

    if (this.filters[bandIndex] && this.audioCtx) {
      this.filters[bandIndex].gain.setTargetAtTime(
        this.eqEnabled ? clampedGain : 0,
        this.audioCtx.currentTime,
        0.05
      );
    }

    this.saveSettings();
  }

  /**
   * Apply a predefined EQ preset
   */
  public setPreset(presetKey: EQPresetKey) {
    if (!EQ_PRESETS[presetKey]) return;
    this.currentPreset = presetKey;
    this.gains = [...EQ_PRESETS[presetKey].gains];

    this.filters.forEach((filter, index) => {
      if (this.audioCtx) {
        filter.gain.setTargetAtTime(
          this.eqEnabled ? this.gains[index] : 0,
          this.audioCtx.currentTime,
          0.05
        );
      }
    });

    this.saveSettings();
  }

  /**
   * Toggle EQ master bypass
   */
  public setEqEnabled(enabled: boolean) {
    this.eqEnabled = enabled;
    this.filters.forEach((filter, index) => {
      if (this.audioCtx) {
        filter.gain.setTargetAtTime(
          enabled ? this.gains[index] : 0,
          this.audioCtx.currentTime,
          0.05
        );
      }
    });
    this.saveSettings();
  }

  /**
   * Toggle volume normalization dynamics compressor
   */
  public setNormalizeEnabled(enabled: boolean) {
    this.normalizeEnabled = enabled;
    if (this.activeElement && this.sourceMap.has(this.activeElement)) {
      const sourceNode = this.sourceMap.get(this.activeElement)!;
      sourceNode.disconnect();
      this.buildGraph(sourceNode);
    }
    this.saveSettings();
  }

  public getState() {
    return {
      gains: [...this.gains],
      currentPreset: this.currentPreset,
      eqEnabled: this.eqEnabled,
      normalizeEnabled: this.normalizeEnabled,
    };
  }

  public resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }
}

export const audioEqualizer = new AudioEqualizerEngine();
