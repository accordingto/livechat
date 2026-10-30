/* CUT Halloween audio: recorded CC0 effects/ambience, loaded only after a
 * sound gesture. Originals and transcode tools stay outside the repository.
 * The manifest is the authority for files/provenance; no external audio host,
 * microphone, voice API or gameplay commands. Two old synth tunes are optional.
 */
var CUT_HALLOWEEN_AUDIO = (() => {
  'use strict';
  const EFFECTS = Object.freeze(['scream','laugh','ghost','howl','door','thunder','heartbeat','bell']);
  const SCARES = Object.freeze(['scream','laugh','ghost','howl','thunder']);
  const AMBIENCE = Object.freeze(['wind','rain']);
  const TRACKS = Object.freeze([...AMBIENCE,'musicbox','crawl']);
  const STORAGE = 'cut-halloween-sound.v1';
  const MANIFEST = 'assets/cut-halloween/audio-v1/manifest.json?v=1';
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
    constructor({onChange=()=>{},storage=typeof localStorage!=='undefined'?localStorage:null,
      context=null,fetchImpl=typeof fetch==='function'?fetch.bind(globalThis):null,manifestUrl=MANIFEST}={}) {
      this.onChange=onChange; this.storage=storage; this.context=context; this.ownsContext=!context;
      this.fetchImpl=fetchImpl; this.manifestUrl=manifestUrl; this.built=false; this.closed=false;
      this.unsupported=false; this.blocked=false; this.assetError=false; this.loading=0;
      this.musicVolume=.28; this.effectsVolume=.65; this.autoScare=true;
      this.track=null; this.scheduler=null; this.nextTime=0; this.step=0; this.trackEpoch=0;
      this.musicVoices=new Set(); this.fxVoices=new Set(); this.buffers=new Map(); this.pending=new Map();
      this.manifest=null; this.manifestPromise=null; this.lastScare='';
      this.controller=typeof AbortController!=='undefined'?new AbortController():null;
      try {
        const saved=JSON.parse(this.storage?.getItem(STORAGE)||'null');
        if(saved&&typeof saved==='object') {
          if(Number.isFinite(saved.musicVolume)) this.musicVolume=clamp(saved.musicVolume,0,1);
          if(Number.isFinite(saved.effectsVolume)) this.effectsVolume=clamp(saved.effectsVolume,0,1);
          if(typeof saved.autoScare==='boolean') this.autoScare=saved.autoScare;
        }
      } catch(e) {}
    }
    save() {
      try { this.storage?.setItem(STORAGE,JSON.stringify({musicVolume:this.musicVolume,effectsVolume:this.effectsVolume,autoScare:this.autoScare})); } catch(e) {}
    }
    get ready() { return !this.closed&&this.context?.state==='running'&&EFFECTS.every(key=>this.buffers.has(key)); }
    async unlock() {
      if(this.closed) return false;
      this.assetError=false;
      try {
        if(!this.context||this.context.state==='closed') {
          if(this.context) { this.stopMusic(true); this.stopEffects(); }
          const Audio=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
          if(!Audio) { this.unsupported=true; this.onChange(); return false; }
          this.context=new Audio(); this.ownsContext=true; this.built=false;
        }
        if(!this.built) this.build(this.context);
        const ctx=this.context;
        // Resume before any download: retain the original user gesture.
        await ctx.resume();
        if(this.closed||this.context!==ctx) return false;
        this.blocked=ctx.state!=='running';
        if(this.blocked) return false;
        await Promise.all(EFFECTS.map(key=>this.load(key)));
        return this.ready;
      } catch(e) { if(!this.closed) { this.assetError=true; this.blocked=this.context?.state!=='running'; } return false; }
      finally { if(!this.closed) this.onChange(); }
    }
    build(ctx) {
      this.built=true; this.context=ctx;
      this.master=ctx.createDynamicsCompressor();
      this.master.threshold.value=-12; this.master.knee.value=8; this.master.ratio.value=12;
      this.master.attack.value=.003; this.master.release.value=.18; this.master.connect(ctx.destination);
      this.musicBus=ctx.createGain(); this.musicBus.gain.value=this.musicVolume; this.musicBus.connect(this.master);
      this.effectsBus=ctx.createGain(); this.effectsBus.gain.value=this.effectsVolume; this.effectsBus.connect(this.master);
      // Short room tail for the OPTIONAL synthesized tunes only. Recordings stay dry.
      this.reverb=ctx.createConvolver();
      const impulse=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.9),ctx.sampleRate), data=impulse.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.18;
      this.reverb.buffer=impulse; this.reverb.connect(this.musicBus);
      const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), white=noise.getChannelData(0);
      for(let i=0;i<white.length;i++) white[i]=Math.random()*2-1;
      this.whiteNoise=noise;
    }
    async readManifest() {
      if(this.manifest) return this.manifest;
      if(!this.fetchImpl) throw new Error('audio_fetch_unavailable');
      if(!this.manifestPromise) this.manifestPromise=(async()=>{
        const response=await this.fetchImpl(this.manifestUrl,{signal:this.controller?.signal,cache:'force-cache'});
        if(!response.ok) throw new Error('audio_manifest_unavailable');
        const value=await response.json();
        if(value.version!==1||!value.assets) throw new Error('audio_manifest_invalid');
        for(const key of [...EFFECTS,...AMBIENCE]) {
          const item=value.assets[key];
          if(!item||!/^[a-z-]+\.mp3$/.test(item.file)||!Number.isFinite(item.duration)||item.duration<=0||item.duration>45) throw new Error('audio_manifest_invalid');
        }
        if(this.closed) throw new Error('audio_closed');
        this.manifest=value; return value;
      })().catch(e=>{this.manifestPromise=null;throw e;});
      return this.manifestPromise;
    }
    load(key) {
      if(this.buffers.has(key)) return Promise.resolve(this.buffers.get(key));
      if(this.pending.has(key)) return this.pending.get(key);
      this.loading++; this.onChange();
      const task=(async()=>{
        const manifest=await this.readManifest(), item=manifest.assets[key], ctx=this.context;
        if(!item||!ctx||this.closed) throw new Error('audio_closed');
        const base=this.manifestUrl.slice(0,this.manifestUrl.lastIndexOf('/')+1);
        const response=await this.fetchImpl(base+item.file+'?v=1',{signal:this.controller?.signal,cache:'force-cache'});
        if(!response.ok) throw new Error('audio_clip_unavailable');
        const encoded=await response.arrayBuffer();
        if(this.closed||this.context!==ctx) throw new Error('audio_closed');
        const decoded=await ctx.decodeAudioData(encoded);
        if(this.closed||this.context!==ctx) throw new Error('audio_closed');
        this.buffers.set(key,decoded); return decoded;
      })().catch(e=>{if(!this.closed)this.assetError=true;throw e;}).finally(()=>{
        this.loading=Math.max(0,this.loading-1); this.pending.delete(key); if(!this.closed)this.onChange();
      });
      this.pending.set(key,task); return task;
    }
    setMusicVolume(value) { this.musicVolume=clamp(Number(value)||0,0,1);this.save();if(this.musicBus)this.musicBus.gain.setTargetAtTime(this.musicVolume,this.context.currentTime,.05); }
    setEffectsVolume(value) { this.effectsVolume=clamp(Number(value)||0,0,1);this.save();if(this.effectsBus)this.effectsBus.gain.setTargetAtTime(this.effectsVolume,this.context.currentTime,.05); }
    setAutoScare(on) {this.autoScare=on===true;this.save();this.onChange();}
    playClip(key,{gain=1,limit=null,offset=0}={}) {
      if(!this.ready||!this.buffers.has(key)) return 0;
      const ctx=this.context, buffer=this.buffers.get(key);
      const duration=Math.min(limit??buffer.duration,buffer.duration-offset);
      if(duration<=0) return 0;
      if(this.fxVoices.size>=3) {const oldest=this.fxVoices.values().next().value;try{oldest.source.stop();}catch(e){}this.fxVoices.delete(oldest);}
      const source=ctx.createBufferSource(), envelope=ctx.createGain(), at=ctx.currentTime+.01;
      source.buffer=buffer; source.connect(envelope);envelope.connect(this.effectsBus);
      envelope.gain.setValueAtTime(0,at);
      envelope.gain.linearRampToValueAtTime(gain,at+Math.min(.025,duration/4));
      envelope.gain.setValueAtTime(gain,at+Math.max(.03,duration-.09));
      envelope.gain.linearRampToValueAtTime(0,at+duration);
      const voice={source,envelope};this.fxVoices.add(voice);
      source.onended=()=>{this.fxVoices.delete(voice);try{source.disconnect();envelope.disconnect();}catch(e){}};
      source.start(at,offset,duration);return duration;
    }
    play(key) {return EFFECTS.includes(key)?this.playClip(key):0;}
    sting() {return this.playClip('bell',{gain:.42,limit:.65});}
    scare() {
      if(!this.ready)return '';
      const choices=SCARES.filter(key=>key!==this.lastScare), key=choices[Math.floor(Math.random()*choices.length)];
      this.lastScare=key;return this.play(key)>0?key:'';
    }
    cut() {return this.autoScare?!!this.scare():this.sting()>0;}
    cue(key) {
      if(!this.ready)return false;
      if(key==='cut')return this.cut();
      // A CUT already tells everyone who is next; avoid layering a second hit.
      if(key==='reveal'||key==='round')return true;
      if(key==='time')return this.playClip('bell',{gain:.4,limit:1.8})>0;
      if(key==='go')return this.playClip('bell',{gain:.25,limit:.38})>0;
      if(key==='tick')return this.playClip('heartbeat',{gain:.18,limit:.1})>0;
      return true;
    }
    toggleMusic(track) {if(this.track===track||!TRACKS.includes(track)){this.stopMusic();return;}return this.startMusic(track);}
    async startMusic(track) {
      if(!this.ready||!TRACKS.includes(track))return;
      this.stopMusic(true);const epoch=this.trackEpoch;this.track=track;this.onChange();
      try {
        const buffer=AMBIENCE.includes(track)?await this.load(track):null;
        if(this.closed||epoch!==this.trackEpoch||this.track!==track)return;
        const ctx=this.context;
        this.musicGain=this.gain(0,this.musicBus);
        this.musicGain.gain.setValueAtTime(0,ctx.currentTime);
        this.musicGain.gain.linearRampToValueAtTime(1,ctx.currentTime+.6);
        this.nextTime=ctx.currentTime+.04;this.step=0;
        if(buffer) {
          this.ambienceBuffer=buffer;
          this.scheduler=setInterval(()=>this.scheduleAmbience(),160);this.scheduleAmbience();
        } else {
          this.musicGain.connect(this.reverb);
          if(track==='musicbox')this.startDrone();
          this.scheduler=setInterval(()=>this.schedule(),60);this.schedule();
        }
      } catch(e) {if(!this.closed&&epoch===this.trackEpoch){this.assetError=true;this.stopMusic(true);}}
      finally {if(!this.closed)this.onChange();}
    }
    scheduleAmbience() {
      if(!this.ready||!AMBIENCE.includes(this.track)||!this.musicGain)return;
      const ctx=this.context, buffer=this.ambienceBuffer, duration=buffer.duration, fade=Math.min(.7,duration/4);
      if(this.nextTime<ctx.currentTime-.1)this.nextTime=ctx.currentTime+.03;
      while(this.nextTime<ctx.currentTime+.8) {
        const at=this.nextTime, source=ctx.createBufferSource(), envelope=this.gain(0,this.musicGain);
        source.buffer=buffer;source.connect(envelope);
        envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(1,at+fade);
        envelope.gain.setValueAtTime(1,at+duration-fade);envelope.gain.linearRampToValueAtTime(0,at+duration);
        this.musicVoices.add(source);
        source.onended=()=>{this.musicVoices.delete(source);try{source.disconnect();envelope.disconnect();}catch(e){}};
        source.start(at);source.stop(at+duration);this.nextTime+=duration-fade;
      }
    }
    stopEffects() {
      for(const voice of this.fxVoices){try{voice.source.stop();voice.source.disconnect();voice.envelope.disconnect();}catch(e){}}
      this.fxVoices.clear();
    }
    stopMusic(silent=false) {
      this.trackEpoch++;if(this.scheduler)clearInterval(this.scheduler);this.scheduler=null;
      const ctx=this.context, fading=this.musicGain, voices=[...new Set([...this.musicVoices,...(this.drone||[])])];
      if(fading&&ctx&&ctx.state!=='closed') {
        const now=ctx.currentTime;fading.gain.cancelScheduledValues(now);fading.gain.setValueAtTime(fading.gain.value,now);fading.gain.linearRampToValueAtTime(0,now+.35);
        setTimeout(()=>{try{fading.disconnect();}catch(e){}},450);
      }
      for(const voice of voices){try{voice.stop(ctx?.currentTime+.38);}catch(e){}}
      this.musicVoices.clear();this.musicGain=null;this.drone=null;this.track=null;this.ambienceBuffer=null;
      if(!silent)this.onChange();
    }
    osc(type, frequency, start, stop, destination) {
      const o = this.context.createOscillator();
      o.type = type; o.frequency.setValueAtTime(frequency, start);
      o.connect(destination); this.musicVoices.add(o);
      o.onended = () => { this.musicVoices.delete(o); try { o.disconnect(); } catch (e) {} };
      o.start(start); o.stop(stop);
      return o;
    }
    gain(value, destination) { const g = this.context.createGain(); g.gain.value = value; g.connect(destination); return g; }
    filter(type, frequency, q, destination) {
      const f = this.context.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = q; f.connect(destination); return f;
    }
    noise(buffer, start, stop, destination) {
      const n = this.context.createBufferSource(); n.buffer = buffer; n.loop = true;
      n.connect(destination); this.musicVoices.add(n);
      n.onended = () => { this.musicVoices.delete(n); try { n.disconnect(); } catch (e) {} };
      n.start(start, Math.random() * 1.5); n.stop(stop);
      return n;
    }
    envelope(g, start, points) {
      g.gain.setValueAtTime(.0001, start);
      for (const [time, value] of points) g.gain.linearRampToValueAtTime(value, start + time);
    }
    vibrato(param, rate, depth, start, stop) {
      const lfo = this.context.createOscillator(), amount = this.context.createGain();
      lfo.frequency.value = rate; amount.gain.value = depth; lfo.connect(amount); amount.connect(param);
      this.musicVoices.add(lfo); lfo.onended = () => { this.musicVoices.delete(lfo); try { lfo.disconnect(); amount.disconnect(); } catch (e) {} };
      lfo.start(start); lfo.stop(stop);
      return lfo;
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
      if(this.nextTime<this.context.currentTime-.1)this.nextTime=this.context.currentTime+.03;
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

    silence() {this.stopMusic();this.stopEffects();}
    close() {
      if(this.closed)return;this.closed=true;this.controller?.abort();this.silence();
      if(this.ownsContext)this.context?.close().catch(()=>{});
      this.context=null;this.buffers.clear();this.pending.clear();
    }
  }
  return Object.freeze({Board,EFFECTS,SCARES,TRACKS,AMBIENCE,STORAGE,MANIFEST});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CUT_HALLOWEEN_AUDIO;
