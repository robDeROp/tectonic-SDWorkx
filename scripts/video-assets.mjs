/**
 * Original, deterministic ambient score. No downloaded music or external APIs.
 * Regenerate with npm run video:assets. The WAV is intentionally not committed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sampleRate = 48000;
const seconds = 64;
const sampleCount = sampleRate * seconds;
const left = new Float32Array(sampleCount);
const right = new Float32Array(sampleCount);
const tau = Math.PI * 2;
const beat = 60 / 105;
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function note(start, duration, midi, volume, pan = 0, pluck = false) {
  const hz = frequency(midi);
  const from = Math.max(0, Math.floor(start * sampleRate));
  const until = Math.min(
    sampleCount,
    Math.ceil((start + duration) * sampleRate),
  );
  for (let i = from; i < until; i++) {
    const t = i / sampleRate - start;
    const attack = Math.min(1, t / (pluck ? 0.014 : 0.65));
    const release = Math.min(1, (duration - t) / (pluck ? 0.35 : 0.9));
    const envelope = attack * release * (pluck ? Math.exp(-t * 2.8) : 0.7);
    const tone =
      Math.sin(tau * hz * t) +
      0.22 * Math.sin(tau * hz * 2 * t + 0.08) +
      0.08 * Math.sin(tau * hz * 3 * t);
    const value = tone * envelope * volume;
    left[i] += value * Math.sqrt((1 - pan) / 2);
    right[i] += value * Math.sqrt((1 + pan) / 2);
  }
}

// Warm Cmaj9 → Am7 → Fmaj9 → Gsus progression, with a restrained bell motif.
const chords = [
  [48, 55, 59, 62, 64],
  [45, 52, 55, 60, 64],
  [41, 48, 55, 57, 60],
  [43, 50, 55, 57, 62],
];
const measure = beat * 8;
for (let section = 0; section * measure < seconds; section++) {
  const at = section * measure;
  const chord = chords[section % chords.length];
  chord.forEach((midi, i) =>
    note(at, measure + 0.8, midi, 0.028, (i - 2) * 0.22),
  );
  for (let step = 0; step < 8; step++) {
    const midi = chord[[2, 4, 3, 4, 1, 3, 4, 2][step]] + 12;
    const hit = at + step * beat + beat * 0.5;
    note(hit, 1.8, midi, 0.055, Math.sin(step) * 0.4, true);
    note(hit + beat * 0.75, 1.25, midi, 0.012, -Math.sin(step) * 0.6, true);
  }
}

// Quiet, rounded pulses; no sharp transients competing with the story.
for (let hit = 4 * beat; hit < seconds - 3; hit += beat * 2) {
  const from = Math.floor(hit * sampleRate);
  for (let j = 0; j < sampleRate * 0.22 && from + j < sampleCount; j++) {
    const t = j / sampleRate;
    const envelope = Math.min(1, t / 0.008) * Math.exp(-t * 22);
    const value =
      Math.sin(tau * (54 * t + 0.8 * (1 - Math.exp(-t * 25)))) *
      envelope *
      0.06;
    left[from + j] += value;
    right[from + j] += value;
  }
}

const output = Buffer.alloc(44 + sampleCount * 4);
output.write("RIFF", 0);
output.writeUInt32LE(output.length - 8, 4);
output.write("WAVEfmt ", 8);
output.writeUInt32LE(16, 16);
output.writeUInt16LE(1, 20);
output.writeUInt16LE(2, 22);
output.writeUInt32LE(sampleRate, 24);
output.writeUInt32LE(sampleRate * 4, 28);
output.writeUInt16LE(4, 32);
output.writeUInt16LE(16, 34);
output.write("data", 36);
output.writeUInt32LE(sampleCount * 4, 40);
let peak = 0;
for (let i = 0; i < sampleCount; i++) {
  const t = i / sampleRate;
  const fade = clamp(t / 1.5, 0, 1) * clamp((seconds - t) / 3, 0, 1);
  for (const [channel, data] of [
    [0, left],
    [1, right],
  ]) {
    // Leave headroom while keeping the instrumental audible without narration.
    const value = data[i] * fade * 5.5;
    peak = Math.max(peak, Math.abs(value));
    output.writeInt16LE(
      Math.round(clamp(value, -1, 1) * 32767),
      44 + i * 4 + channel * 2,
    );
  }
}
const destination = resolve(root, "public/hunch-video");
mkdirSync(destination, { recursive: true });
writeFileSync(resolve(destination, "soundtrack.wav"), output);
console.log(
  `Created 64s original stereo soundtrack (peak ${peak.toFixed(3)}).`,
);
