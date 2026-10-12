/* Approved Bomb Relay cues. Tick: 52.5 ms from the supplied recording,
 * DC removed, gently gated/faded, same lighter preview gain. Boom: the
 * approved short, bass-reduced noise burst. No media loading or room state. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BOMB_RELAY_AUDIO = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const pcmBase64 = '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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const bytes = typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(pcmBase64, 'base64')) :
    Uint8Array.from(atob(pcmBase64), value => value.charCodeAt(0));
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const recording = new Float32Array(bytes.length / 2);
  let originalPeak = 0;
  for (let i = 0; i < recording.length; i++) {
    recording[i] = data.getInt16(i * 2, true) / 32767;
    originalPeak = Math.max(originalPeak, Math.abs(recording[i]));
  }
  const TAU = 2 * Math.PI;
  const ramp = x => x <= 0 ? 0 : x >= 1 ? 1 : (1 - Math.cos(Math.PI * x)) / 2;
  const envelope = (time, length, attack, decay, release) =>
    ramp(time / attack) * Math.exp(-time / decay) * ramp((length - time) / release);
  function random(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let x = Math.imul(value ^ (value >>> 15), value | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function filter(samples, sampleRate, frequency, mode) {
    const omega = TAU * frequency / sampleRate, cosine = Math.cos(omega);
    const alpha = Math.sin(omega) / Math.SQRT2, a0 = 1 + alpha;
    const a1 = -2 * cosine / a0, a2 = (1 - alpha) / a0;
    let b0, b1, b2;
    if (mode === 'highpass') { b0 = (1 + cosine) / 2 / a0; b1 = -(1 + cosine) / a0; b2 = b0; }
    else { b0 = (1 - cosine) / 2 / a0; b1 = (1 - cosine) / a0; b2 = b0; }
    const output = new Float32Array(samples.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < samples.length; i++) {
      const x0 = samples[i], y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      output[i] = y0; x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    }
    return output;
  }
  const band = (samples, sampleRate, low, high) => filter(filter(filter(samples, sampleRate, low, 'highpass'), sampleRate, low, 'highpass'), sampleRate, high, 'lowpass');
  function noise(length, sampleRate, seed) {
    const output = new Float32Array(Math.round(length * sampleRate)), next = random(seed);
    for (let i = 0; i < output.length; i++) output[i] = next() * 2 - 1;
    return output;
  }
  function explosion(sampleRate) {
    const length = .52, attack = .010;
    const wide = band(noise(length, sampleRate, 0xb00b), sampleRate, 320, 5900);
    const body = band(noise(length, sampleRate, 0xc12a), sampleRate, 340, 1600);
    const crack = band(noise(length, sampleRate, 0xbaa9), sampleRate, 1200, 6400);
    const output = new Float32Array(wide.length);
    for (let i = 0; i < output.length; i++) {
      const time = i / sampleRate;
      const main = envelope(time, length, attack, .066, .16) * wide[i];
      const pressure = envelope(time, length, attack + .004, .093, .18) * body[i] * .52;
      const initial = envelope(time, .105, attack, .022, .030) * crack[i] * .42;
      output[i] = main + pressure + initial;
    }
    const samples = band(output, sampleRate, 320, 6200);
    let maximum = 0;
    for (let i = 0; i < samples.length; i++) {
      samples[i] *= ramp(i / (sampleRate * .004)) * ramp((samples.length - 1 - i) / (sampleRate * .012));
      maximum = Math.max(maximum, Math.abs(samples[i]));
    }
    if (maximum) for (let i = 0; i < samples.length; i++) samples[i] *= .36 / maximum;
    samples[0] = 0; samples[samples.length - 1] = 0;
    return samples;
  }
  function tick(sampleRate) {
    const size = Math.round(recording.length * sampleRate / 48000);
    const samples = new Float32Array(size), gain = .16 / originalPeak;
    for (let i = 0; i < size; i++) {
      const position = i * 48000 / sampleRate, left = Math.floor(position), fraction = position - left;
      samples[i] = ((recording[left] || 0) * (1 - fraction) + (recording[left + 1] || 0) * fraction) * gain;
    }
    samples[0] = 0;
    return samples;
  }
  function getSamples(kind, sampleRate = 48000) {
    if (!Number.isInteger(sampleRate) || sampleRate < 16000 || sampleRate > 96000) throw new RangeError('Unsupported audio sample rate');
    if (kind === 'tick') return tick(sampleRate);
    if (kind === 'boom') return explosion(sampleRate);
    throw new RangeError('Unknown Bomb Relay cue');
  }
  return Object.freeze({ getSamples, cadenceMs: 1000, gain: .6 });
});
