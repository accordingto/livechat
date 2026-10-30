/* CUT! 🎃 Halloween sound board for the host page.
 * Everything is synthesized with Web Audio on this device: two original
 * looping spooky tunes and eight effects. No recordings, downloads,
 * microphone or external media. Nothing here touches the game state.
 */
var CUT_HALLOWEEN_AUDIO = (() => {
  'use strict';
  const EFFECTS = Object.freeze(['scream', 'laugh', 'ghost', 'howl', 'door', 'thunder', 'heartbeat', 'bell']);
  const SCARES = Object.freeze(['scream', 'laugh', 'ghost', 'howl', 'thunder']);
  const TRACKS = Object.freeze(['musicbox', 'crawl']);
  const STORAGE = 'cut-halloween-sound.v1';
  const midi = note => 440 * Math.pow(2, (note - 69) / 12);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  /* Original melodies. Each step is [note or null, length in beats]. */
  // A slow music-box waltz in D harmonic minor (3/4, two-bar phrases).
  const MUSIC_BOX = {
    bpm: 92, beatsPerBar: 3,
    melody: [[74, 1], [77, 1], [81, 1], [80, 1], [81, 1], [77, 1], [76, 1], [79, 1], [82, 1], [81, 3],
      [79, 1], [77, 1], [76, 1], [74, 1], [73, 1], [76, 1], [77, 2], [76, 1], [74, 3],
      [74, 1], [77, 1], [81, 1], [86, 2], [85, 1], [82, 1], [81, 1], [79, 1], [77, 3],
      [76, 1], [79, 1], [77, 1], [76, 1], [73, 1], [69, 1], [74, 3], [null, 3]],
    // One chord root per bar: Dm Dm Bb A | Gm Dm A Dm …
    bass: [50, 50, 46, 45, 43, 50, 45, 50, 50, 50, 46, 45, 43, 45, 50, 50],
  };
  // A tiptoeing minor crawl (4/4): staccato bass, high plinks off the beat.
  const CRAWL = {
    bpm: 108, beatsPerBar: 4,
    bassLine: [38, null, 41, null, 44, 45, null, 44, 38, null, 41, null, 44, 45, 48, 45,
      43, null, 46, null, 49, 50, null, 49, 45, null, 44, null, 43, 42, 41, 40],
    plinks: [null, 86, null, 89, null, 92, null, 93, null, 86, null, 89, null, 92, 93, null,
      null, 91, null, 94, null, 97, null, 98, null, 93, null, 92, null, 89, 86, null],
  };

  class Board {
    constructor({ onChange = () => {}, storage = typeof localStorage !== 'undefined' ? localStorage : null } = {}) {
      this.onChange = onChange; this.storage = storage;
      this.context = null; this.unsupported = false; this.blocked = false;
      this.musicVolume = .5; this.effectsVolume = .8; this.autoScare = true;
      this.track = null; this.scheduler = null; this.nextTime = 0; this.step = 0;
      this.voices = new Set(); this.lastScare = '';
      try {
        const saved = JSON.parse(this.storage?.getItem(STORAGE) || 'null');
        if (saved && typeof saved === 'object') {
          if (Number.isFinite(saved.musicVolume)) this.musicVolume = clamp(saved.musicVolume, 0, 1);
          if (Number.isFinite(saved.effectsVolume)) this.effectsVolume = clamp(saved.effectsVolume, 0, 1);
          if (typeof saved.autoScare === 'boolean') this.autoScare = saved.autoScare;
        }
      } catch (e) {}
    }
    save() {
      try { this.storage?.setItem(STORAGE, JSON.stringify({ musicVolume: this.musicVolume, effectsVolume: this.effectsVolume, autoScare: this.autoScare })); } catch (e) {}
    }
    // Must run inside a click or tap so browsers allow sound.
    async unlock() {
      try {
        const Audio = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!Audio) { this.unsupported = true; this.onChange(); return false; }
        if (!this.context || this.context.state === 'closed') this.build(new Audio());
        await this.context.resume();
        this.blocked = this.context.state !== 'running';
      } catch (e) { this.blocked = true; }
      this.onChange();
      return !this.blocked;
    }
    build(ctx) {
      this.context = ctx;
      this.master = ctx.createDynamicsCompressor();
      this.master.threshold.value = -14; this.master.ratio.value = 4;
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVolume; this.musicBus.connect(this.master);
      this.effectsBus = ctx.createGain(); this.effectsBus.gain.value = this.effectsVolume; this.effectsBus.connect(this.master);
      // A generated hall: decaying stereo noise, so no impulse file is needed.
      const length = Math.floor(ctx.sampleRate * 2.6), impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = impulse.getChannelData(c);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
      }
      this.reverb = ctx.createConvolver(); this.reverb.buffer = impulse;
      this.wetMusic = ctx.createGain(); this.wetMusic.gain.value = .45; this.reverb.connect(this.wetMusic); this.wetMusic.connect(this.musicBus);
      this.reverbFx = ctx.createConvolver(); this.reverbFx.buffer = impulse;
      this.wetFx = ctx.createGain(); this.wetFx.gain.value = .5; this.reverbFx.connect(this.wetFx); this.wetFx.connect(this.effectsBus);
      const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), white = noise.getChannelData(0);
      for (let i = 0; i < white.length; i++) white[i] = Math.random() * 2 - 1;
      this.whiteNoise = noise;
      const brown = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), b = brown.getChannelData(0);
      let last = 0;
      for (let i = 0; i < b.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
      this.brownNoise = brown;
    }
    get ready() { return !!this.context && this.context.state === 'running'; }
    setMusicVolume(value) {
      this.musicVolume = clamp(Number(value) || 0, 0, 1); this.save();
      if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, .05);
    }
    setEffectsVolume(value) {
      this.effectsVolume = clamp(Number(value) || 0, 0, 1); this.save();
      if (this.effectsBus) this.effectsBus.gain.setTargetAtTime(this.effectsVolume, this.context.currentTime, .05);
    }
    setAutoScare(on) { this.autoScare = on === true; this.save(); this.onChange(); }

    // ----- building blocks -----
    osc(type, frequency, start, stop, destination) {
      const o = this.context.createOscillator();
      o.type = type; o.frequency.setValueAtTime(frequency, start);
      o.connect(destination); this.voices.add(o);
      o.onended = () => { this.voices.delete(o); try { o.disconnect(); } catch (e) {} };
      o.start(start); o.stop(stop);
      return o;
    }
    gain(value, destination) { const g = this.context.createGain(); g.gain.value = value; g.connect(destination); return g; }
    filter(type, frequency, q, destination) {
      const f = this.context.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = q; f.connect(destination); return f;
    }
    noise(buffer, start, stop, destination) {
      const n = this.context.createBufferSource(); n.buffer = buffer; n.loop = true;
      n.connect(destination); this.voices.add(n);
      n.onended = () => { this.voices.delete(n); try { n.disconnect(); } catch (e) {} };
      n.start(start, Math.random() * 1.5); n.stop(stop);
      return n;
    }
    envelope(g, start, points) {
      g.gain.setValueAtTime(.0001, start);
      for (const [time, value] of points) g.gain.linearRampToValueAtTime(value, start + time);
    }
    out(dry = 1, wet = .35) {
      const g = this.context.createGain(); g.gain.value = 1;
      const d = this.gain(dry, this.effectsBus), w = this.gain(wet, this.reverbFx);
      g.connect(d); g.connect(w);
      return g;
    }
    vibrato(param, rate, depth, start, stop) {
      const lfo = this.context.createOscillator(), amount = this.context.createGain();
      lfo.frequency.value = rate; amount.gain.value = depth; lfo.connect(amount); amount.connect(param);
      this.voices.add(lfo); lfo.onended = () => { this.voices.delete(lfo); try { lfo.disconnect(); amount.disconnect(); } catch (e) {} };
      lfo.start(start); lfo.stop(stop);
      return lfo;
    }
    softClip() {
      const shaper = this.context.createWaveShaper(), curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.4 * x); }
      shaper.curve = curve; return shaper;
    }

    // ----- effects (each returns its length in seconds) -----
    play(name) {
      if (!this.ready || !EFFECTS.includes(name)) return 0;
      const t = this.context.currentTime + .02;
      return this['fx_' + name](t);
    }
    fx_scream(t) {
      const out = this.out(.9, .35), env = this.gain(0, out), d = 1.7;
      this.envelope(env, t, [[.05, .55], [.35, .5], [1.15, .42], [d, .0001]]);
      const shape = this.softClip(); shape.connect(env);
      const formants = [[950, 6, .9], [1500, 7, .55], [2700, 9, .5]].map(([f, q, level]) => this.filter('bandpass', f, q, this.gain(level, shape)));
      for (const detune of [1, 1.012]) {
        const o = this.context.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(520 * detune, t);
        o.frequency.exponentialRampToValueAtTime(1180 * detune, t + .14);
        o.frequency.exponentialRampToValueAtTime(1020 * detune, t + .9);
        o.frequency.exponentialRampToValueAtTime(640 * detune, t + d);
        for (const f of formants) o.connect(f);
        this.vibrato(o.frequency, 6.8, 38, t, t + d);
        this.voices.add(o); o.onended = () => { this.voices.delete(o); try { o.disconnect(); } catch (e) {} };
        o.start(t); o.stop(t + d + .05);
      }
      const breath = this.gain(0, out); this.envelope(breath, t, [[.04, .12], [1.2, .08], [d, .0001]]);
      this.noise(this.whiteNoise, t, t + d, this.filter('bandpass', 3200, 1.2, breath));
      return d;
    }
    fx_laugh(t) {
      const out = this.out(.85, .45), d = 2.1;
      const shape = this.softClip(); shape.connect(out);
      const vowel = [[720, 5, 1], [1180, 7, .55], [2500, 8, .25]].map(([f, q, level]) => this.filter('bandpass', f, q, this.gain(level, shape)));
      const voice = this.gain(0, vowel[0]); voice.connect(vowel[1]); voice.connect(vowel[2]);
      const o = this.context.createOscillator(); o.type = 'sawtooth'; o.connect(voice);
      o.frequency.setValueAtTime(190, t);
      voice.gain.setValueAtTime(.0001, t);
      // "Mwa-ha-ha-ha-haaa": falling, slowing pulses.
      const beats = [[0, .26, 205, .9], [.36, .13, 180, .75], [.56, .13, 170, .75], [.76, .13, 160, .75], [.96, .14, 150, .72], [1.18, .6, 132, .7]];
      for (const [at, length, pitch, level] of beats) {
        o.frequency.setValueAtTime(pitch * 1.08, t + at); o.frequency.exponentialRampToValueAtTime(pitch, t + at + length);
        voice.gain.setValueAtTime(.0001, t + at); voice.gain.linearRampToValueAtTime(level, t + at + .025);
        voice.gain.setValueAtTime(level, t + at + length * .6); voice.gain.linearRampToValueAtTime(.0001, t + at + length);
        const h = this.gain(0, out); this.envelope(h, t + at, [[.02, .09], [.08, .0001]]);
        this.noise(this.whiteNoise, t + at, t + at + .1, this.filter('highpass', 1800, .7, h));
      }
      this.voices.add(o); o.onended = () => { this.voices.delete(o); try { o.disconnect(); } catch (e) {} };
      o.start(t); o.stop(t + d);
      return d;
    }
    fx_ghost(t) {
      const out = this.out(.6, .9), d = 3, env = this.gain(0, out);
      this.envelope(env, t, [[.6, .32], [2.2, .28], [d, .0001]]);
      const o = this.context.createOscillator(); o.type = 'sine'; o.connect(env);
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(560, t + 1); o.frequency.exponentialRampToValueAtTime(470, t + 1.8); o.frequency.exponentialRampToValueAtTime(260, t + d);
      this.vibrato(o.frequency, 5, 14, t, t + d);
      this.voices.add(o); o.onended = () => { this.voices.delete(o); try { o.disconnect(); } catch (e) {} };
      o.start(t); o.stop(t + d + .05);
      const wind = this.gain(0, out); this.envelope(wind, t, [[.8, .14], [d, .0001]]);
      const sweep = this.filter('bandpass', 400, 6, wind);
      sweep.frequency.setValueAtTime(400, t); sweep.frequency.linearRampToValueAtTime(950, t + 1.5); sweep.frequency.linearRampToValueAtTime(350, t + d);
      this.noise(this.whiteNoise, t, t + d, sweep);
      return d;
    }
    fx_howl(t) {
      const out = this.out(.75, .7), d = 3, env = this.gain(0, out);
      this.envelope(env, t, [[.25, .4], [2.1, .38], [d, .0001]]);
      const tone = this.filter('lowpass', 1300, 1, env);
      for (const [type, level] of [['sawtooth', .5], ['triangle', 1]]) {
        const g = this.gain(level, tone), o = this.context.createOscillator(); o.type = type; o.connect(g);
        o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(760, t + .75);
        o.frequency.setValueAtTime(760, t + 1.9); o.frequency.exponentialRampToValueAtTime(470, t + d);
        this.vibrato(o.frequency, 5.2, 11, t + .6, t + d);
        this.voices.add(o); o.onended = () => { this.voices.delete(o); try { o.disconnect(); } catch (e) {} };
        o.start(t); o.stop(t + d + .05);
      }
      return d;
    }
    fx_door(t) {
      const out = this.out(.95, .35), d = 1.9, env = this.gain(0, out);
      this.envelope(env, t, [[.1, .7], [1.4, .55], [1.65, .0001]]);
      const body = [[1350, 9, 1], [2450, 12, .5]].map(([f, q, level]) => this.filter('bandpass', f, q, this.gain(level, env)));
      // A slow, uneven train of clicks is what makes a hinge creak.
      const o = this.context.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(14, t); o.frequency.linearRampToValueAtTime(42, t + .5);
      o.frequency.linearRampToValueAtTime(22, t + 1.0); o.frequency.linearRampToValueAtTime(36, t + 1.4); o.frequency.linearRampToValueAtTime(12, t + 1.65);
      for (const f of body) o.connect(f);
      this.voices.add(o); o.onended = () => { this.voices.delete(o); try { o.disconnect(); } catch (e) {} };
      o.start(t); o.stop(t + 1.7);
      const thud = this.gain(0, out); this.envelope(thud, t + 1.66, [[.01, .9], [.25, .0001]]);
      const k = this.context.createOscillator(); k.type = 'sine'; k.connect(thud);
      k.frequency.setValueAtTime(95, t + 1.66); k.frequency.exponentialRampToValueAtTime(45, t + d);
      this.voices.add(k); k.onended = () => { this.voices.delete(k); try { k.disconnect(); } catch (e) {} };
      k.start(t + 1.66); k.stop(t + d);
      return d;
    }
    fx_thunder(t) {
      const out = this.out(.9, .55), d = 3.6;
      const crack = this.gain(0, out); this.envelope(crack, t, [[.01, .8], [.12, .25], [.35, .0001]]);
      this.noise(this.whiteNoise, t, t + .4, this.filter('highpass', 1200, .6, crack));
      const rumble = this.gain(0, out); this.envelope(rumble, t, [[.12, 1.1], [.6, .8], [1.4, 1], [d, .0001]]);
      const low = this.filter('lowpass', 320, .8, rumble);
      low.frequency.setValueAtTime(600, t); low.frequency.exponentialRampToValueAtTime(140, t + d);
      this.noise(this.brownNoise, t, t + d, low);
      return d;
    }
    fx_heartbeat(t) {
      const out = this.out(1, .15), d = 3.1;
      const beats = [0, .9, 1.65, 2.3];
      for (const at of beats) for (const [offset, level] of [[0, .95], [.21, .7]]) {
        const start = t + at + offset, g = this.gain(0, out); this.envelope(g, start, [[.012, level], [.2, .0001]]);
        const o = this.context.createOscillator(); o.type = 'sine'; o.connect(g);
        o.frequency.setValueAtTime(95, start); o.frequency.exponentialRampToValueAtTime(42, start + .16);
        this.voices.add(o); o.onended = () => { this.voices.delete(o); try { o.disconnect(); } catch (e) {} };
        o.start(start); o.stop(start + .22);
      }
      return d;
    }
    fx_bell(t) {
      const out = this.out(.7, .8), d = 4.6;
      // Church-bell partials: hum, prime, minor third, fifth, octave …
      const partials = [[.5, .5, 4], [1, .6, 3], [1.19, .35, 2.4], [1.5, .25, 2], [2, .3, 1.6], [2.51, .14, 1.1], [3, .1, .9]];
      for (const at of [0, 1.5]) for (const [ratio, level, decay] of partials) {
        const start = t + at, g = this.gain(0, out); this.envelope(g, start, [[.006, level * .55], [decay, .0001]]);
        this.osc('sine', 196 * ratio, start, start + decay + .05, g);
      }
      return d;
    }
    // A short spooky stab used for each CUT when random scares are off.
    sting() {
      if (!this.ready) return 0;
      const t = this.context.currentTime + .01, out = this.out(.8, .5), env = this.gain(0, out);
      this.envelope(env, t, [[.015, .35], [.5, .0001]]);
      const tone = this.filter('lowpass', 2400, 1, env);
      for (const note of [62, 68, 73]) this.osc('sawtooth', midi(note), t, t + .55, tone);
      const g = this.gain(0, out); this.envelope(g, t + .05, [[.02, .22], [.45, .0001]]);
      const o = this.osc('sine', 1100, t + .05, t + .55, g); o.frequency.exponentialRampToValueAtTime(260, t + .5);
      return .55;
    }
    // One random scare, never the same one twice in a row.
    scare() {
      if (!this.ready) return '';
      const options = SCARES.filter(name => name !== this.lastScare);
      const name = options[Math.floor(Math.random() * options.length)];
      this.lastScare = name; this.play(name);
      return name;
    }
    // The CUT cue on the host page: a random scare or the short sting.
    cut() { return this.autoScare ? !!this.scare() : this.sting() > 0; }

    // ----- music -----
    toggleMusic(track) {
      if (this.track === track || !TRACKS.includes(track)) { this.stopMusic(); return; }
      this.startMusic(track);
    }
    startMusic(track) {
      if (!this.ready || !TRACKS.includes(track)) return;
      this.stopMusic(true);
      this.track = track; this.step = 0; this.nextTime = this.context.currentTime + .08;
      this.musicGain = this.gain(0, this.musicBus); this.musicGain.connect(this.reverb);
      this.musicGain.gain.setValueAtTime(.0001, this.context.currentTime); this.musicGain.gain.linearRampToValueAtTime(1, this.context.currentTime + 1.2);
      if (track === 'musicbox') this.startDrone();
      this.scheduler = setInterval(() => this.schedule(), 60);
      this.schedule(); this.onChange();
    }
    stopMusic(silent = false) {
      if (this.scheduler) clearInterval(this.scheduler);
      this.scheduler = null;
      const fading = this.musicGain;
      if (fading && this.context) {
        const now = this.context.currentTime;
        fading.gain.cancelScheduledValues(now); fading.gain.setValueAtTime(fading.gain.value, now); fading.gain.linearRampToValueAtTime(.0001, now + .5);
        setTimeout(() => { try { fading.disconnect(); } catch (e) {} }, 700);
      }
      for (const node of this.drone || []) { try { node.stop(this.context.currentTime + .55); } catch (e) {} }
      this.drone = null; this.musicGain = null; this.track = null;
      if (!silent) this.onChange();
    }
    startDrone() {
      const ctx = this.context, g = this.gain(.07, this.musicGain), low = this.filter('lowpass', 380, .7, g);
      this.drone = [38, 38.07, 45].map(note => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(note); o.connect(low); o.start(); return o;
      });
      this.drone.push(this.vibrato(low.frequency, .08, 120, ctx.currentTime, ctx.currentTime + 3600));
    }
    schedule() {
      if (!this.ready || !this.track) return;
      const ahead = this.context.currentTime + .3;
      while (this.nextTime < ahead) {
        if (this.track === 'musicbox') this.musicBoxStep(); else this.crawlStep();
      }
    }
    musicBoxStep() {
      const song = MUSIC_BOX, beat = 60 / song.bpm;
      const [note, beats] = song.melody[this.step % song.melody.length];
      const at = this.nextTime;
      if (note) this.chime(midi(note), at, Math.max(1.2, beats * beat * 1.4));
      // Bass on the downbeat of each bar, counted from the melody so far.
      const before = song.melody.slice(0, this.step % song.melody.length).reduce((sum, [, b]) => sum + b, 0);
      if (before % song.beatsPerBar === 0) {
        const bar = Math.floor(before / song.beatsPerBar) % song.bass.length;
        this.pluck(midi(song.bass[bar]), at, beat * song.beatsPerBar * .9, .24);
      }
      this.nextTime += beats * beat; this.step++;
    }
    crawlStep() {
      const song = CRAWL, eighth = 60 / song.bpm / 2, i = this.step % song.bassLine.length, at = this.nextTime;
      if (song.bassLine[i]) this.pluck(midi(song.bassLine[i]), at, eighth * .9, .42);
      if (song.plinks[i]) this.chime(midi(song.plinks[i]), at, .5, .07);
      if (i % 8 === 0) this.tap(at);
      this.nextTime += eighth; this.step++;
    }
    chime(frequency, at, length, level = .12) {
      const g = this.gain(0, this.musicGain); this.envelope(g, at, [[.004, level], [length, .0001]]);
      this.osc('sine', frequency, at, at + length + .05, g);
      const h = this.gain(0, this.musicGain); this.envelope(h, at, [[.003, level * .35], [length * .45, .0001]]);
      this.osc('triangle', frequency * 2.01, at, at + length * .5, h);
    }
    pluck(frequency, at, length, level) {
      const g = this.gain(0, this.musicGain); this.envelope(g, at, [[.008, level], [length, .0001]]);
      const low = this.filter('lowpass', 700, 2, g);
      this.osc('triangle', frequency, at, at + length + .05, low);
    }
    tap(at) {
      const g = this.gain(0, this.musicGain); this.envelope(g, at, [[.003, .05], [.06, .0001]]);
      this.noise(this.whiteNoise, at, at + .08, this.filter('bandpass', 2600, 4, g));
    }
    silence() {
      this.stopMusic();
      for (const voice of this.voices) { try { voice.stop(); voice.disconnect(); } catch (e) {} }
      this.voices.clear();
    }
    close() { this.silence(); this.context?.close().catch(() => {}); this.context = null; }
  }
  return Object.freeze({ Board, EFFECTS, SCARES, TRACKS, STORAGE });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_HALLOWEEN_AUDIO;
