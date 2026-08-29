/**
 * Synthesizes a luxury, crystal-clear POS cash register / payment success chime
 * using the Web Audio API without needing external MP3 files.
 */
export function playPaymentSuccessSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Harmonic Chord Notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
    const notes = [
      { freq: 523.25, time: 0.0,  duration: 0.35, gain: 0.15 },
      { freq: 659.25, time: 0.08, duration: 0.40, gain: 0.18 },
      { freq: 783.99, time: 0.16, duration: 0.55, gain: 0.22 },
      { freq: 1046.5, time: 0.24, duration: 0.85, gain: 0.25 },
    ];

    notes.forEach(({ freq, time, duration, gain: maxGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Smooth attack & exponential decay
      gainNode.gain.setValueAtTime(0.001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(maxGain, now + time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  } catch {
    // AudioContext blocked or not supported; gracefully ignore
  }
}
