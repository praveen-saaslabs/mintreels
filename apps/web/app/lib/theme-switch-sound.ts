/** Short synthesized switch click — no asset/secret involved. */
export function playThemeSwitchSound(nextTheme: 'light' | 'dark') {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioCtx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return;
  }

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Slightly higher pitch when switching to light, lower when switching to dark.
    osc.frequency.setValueAtTime(nextTheme === 'light' ? 740 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(
      nextTheme === 'light' ? 980 : 280,
      now + 0.08,
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);

    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Autoplay / audio context failures are non-fatal.
  }
}
