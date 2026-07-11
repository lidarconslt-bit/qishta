// Reusable, dependency-free audio foundation built on the Web Audio API.
//
// This module knows nothing about قشطة specifically - it just loads and
// plays short sound effects by id, with mobile autoplay handling and
// graceful no-ops whenever audio can't play for any reason. Game-specific
// sound names and wiring belong in sound.ts, which sits on top of this.
//
// No sounds are registered here, and nothing calls register()/preload()
// yet - this is infrastructure only.

interface LoadedSound {
  buffer: AudioBuffer;
}

class AudioManagerImpl {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources = new Map<string, string>();
  private loaded = new Map<string, LoadedSound>();
  private loading = new Map<string, Promise<LoadedSound | null>>();
  private unlocked = false;
  private volumeValue = 1;

  constructor() {
    if (typeof window === "undefined") return;
    const unlock = () => this.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }

  /** Registers a sound's source URL under an id. Loading happens lazily via preload()/play(). */
  register(id: string, url: string): void {
    this.sources.set(id, url);
  }

  /** Decodes and caches sounds ahead of time so play() has no latency. Safe to call with nothing registered. */
  async preload(ids?: string[]): Promise<void> {
    const targets = ids ?? Array.from(this.sources.keys());
    await Promise.all(targets.map((id) => this.load(id)));
  }

  /** Plays a registered sound immediately. Silently does nothing if it isn't registered, loaded, or playable. */
  play(id: string): void {
    const context = this.getContext();
    if (!context || !this.masterGain) return;
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const cached = this.loaded.get(id);
    if (cached) {
      this.playBuffer(cached.buffer);
      return;
    }
    this.load(id)
      .then((sound) => {
        if (sound) this.playBuffer(sound.buffer);
      })
      .catch(() => {});
  }

  /** Unlocks audio on mobile browsers that require a user gesture. Called automatically on first interaction. */
  unlock(): void {
    if (this.unlocked) return;
    const context = this.getContext();
    if (!context) return;
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    this.unlocked = true;
  }

  get volume(): number {
    return this.volumeValue;
  }

  set volume(value: number) {
    this.volumeValue = Math.min(1, Math.max(0, value));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volumeValue;
    }
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof AudioContext === "undefined") return null;
    try {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volumeValue;
      this.masterGain.connect(this.context.destination);
    } catch {
      this.context = null;
    }
    return this.context;
  }

  private async load(id: string): Promise<LoadedSound | null> {
    const alreadyLoaded = this.loaded.get(id);
    if (alreadyLoaded) return alreadyLoaded;
    const inFlight = this.loading.get(id);
    if (inFlight) return inFlight;

    const url = this.sources.get(id);
    const context = this.getContext();
    if (!url || !context) return null;

    const promise = (async (): Promise<LoadedSound | null> => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        const sound: LoadedSound = { buffer };
        this.loaded.set(id, sound);
        return sound;
      } catch {
        return null;
      } finally {
        this.loading.delete(id);
      }
    })();

    this.loading.set(id, promise);
    return promise;
  }

  private playBuffer(buffer: AudioBuffer): void {
    if (!this.context || !this.masterGain) return;
    try {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);
      source.start(0);
    } catch {
      /* playback failed; nothing to recover, next play() attempt is unaffected */
    }
  }
}

export const AudioManager = new AudioManagerImpl();
