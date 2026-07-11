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
    const unlock = (e: Event) => this.unlock(e.type);
    // iOS Safari's user-activation tracking for Web Audio does not reliably
    // recognize Pointer Events - touchstart/mousedown/keydown are the event
    // types it has always honored, so those are the primary unlock triggers.
    // pointerdown stays too for non-iOS browsers already relying on it.
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("mousedown", unlock, { once: true });
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
    this.playWhenRunning(context, id).catch(() => {});
  }

  /**
   * iOS Safari suspends new AudioContexts until a user gesture, and starting
   * a buffer source while state is still "suspended" is silently dropped
   * rather than queued - so playback must wait for state to actually become
   * "running" before calling start().
   */
  private async playWhenRunning(context: AudioContext, id: string): Promise<void> {
    if (context.state !== "running") {
      await context.resume().catch(() => {});
    }
    // TEMP DEBUG - remove once iOS Safari playback is confirmed fixed.
    console.log(`[audio] play("${id}") context=${context.state}, loaded=${this.loaded.has(id)}`);
    if (context.state !== "running") return;

    const sound = this.loaded.get(id) ?? (await this.load(id));
    if (sound) this.playBuffer(sound.buffer);
  }

  /** Unlocks audio on mobile browsers that require a user gesture. Called automatically on first interaction. */
  unlock(eventType?: string): void {
    if (this.unlocked) return;
    const context = this.getContext();
    // TEMP DEBUG - remove once iOS Safari playback is confirmed fixed.
    console.log(`[audio] unlock() via "${eventType}", context=${context ? context.state : "null"}`);
    if (!context || !this.masterGain) return;
    this.unlocked = true;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    // iOS Safari only fully unlocks its audio hardware once an actual buffer
    // has been started synchronously inside a user gesture - resume() alone
    // can report "running" while the device stays silent. Playing a single
    // silent sample here is the standard iOS Safari unlock pattern.
    try {
      const silentBuffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.masterGain);
      source.start(0);
      // TEMP DEBUG - remove once iOS Safari playback is confirmed fixed.
      console.log(`[audio] silent unlock buffer started, context now=${context.state}`);
    } catch (err) {
      // TEMP DEBUG - remove once iOS Safari playback is confirmed fixed.
      console.log("[audio] silent unlock buffer failed", err);
    }
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
