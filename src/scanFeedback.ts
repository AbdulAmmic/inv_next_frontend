// Scanner feedback: a short retail-style "piip" on success, a low buzz on
// failure. Generated with Web Audio so there is no sound file to ship.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // Browsers start the context suspended until a user gesture; resuming
    // here is a no-op once it is running.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ac.currentTime + start;
  // Quick attack/release envelope so it clicks less and sounds like a scanner
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  gain.gain.setValueAtTime(volume, t + duration - 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function beepSuccess() {
  tone(2400, 0, 0.11, "square", 0.08);
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(40);
}

export function beepError() {
  tone(220, 0, 0.14, "sawtooth", 0.07);
  tone(180, 0.16, 0.18, "sawtooth", 0.07);
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([60, 40, 60]);
}

/** Call from a click handler (e.g. opening the scanner) so later beeps aren't blocked by autoplay rules. */
export function primeScanAudio() {
  audio();
}
