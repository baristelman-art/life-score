/*
  Life Score — core scoring logic
  Shared by results.html (and any future page) so the math never drifts apart.
*/

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/* ---------- Instant analysis (no day-count question at all) ----------
   Shown immediately after the habit list is marked. There's no behavior
   history yet, so we start from an honest baseline assumption:
   - "keep" habits: assumed on track (fit = 1) — benefit of the doubt,
     since the person says they're already doing it.
   - "start" habits: not yet begun (fit = 0) — true by definition of "new".
   - "quit" habits: not yet let go of (fit = 0) — true until proven otherwise.
   This baseline is what later check-ins (once someone has an account and
   returns) will refine with real repeated data.
*/
function instantAnalysis(habits) {
  const scorable = habits.filter(h => h.choice !== 'na');
  if (scorable.length === 0) return { score: null, bottleneck: null, perHabit: [] };

  const perHabit = scorable.map(h => {
    const fit = h.choice === 'keep' ? 1 : 0;
    return {
      name: h.name,
      choice: h.choice,
      fit,
      daysRemaining: daysRemaining(h.choice, fit)
    };
  });

  const avgFit = perHabit.reduce((sum, h) => sum + h.fit, 0) / perHabit.length;
  const score = Math.round(100 * clamp01(avgFit));

  const bottleneck = perHabit.reduce((worst, h) =>
    (!worst || h.daysRemaining > worst.daysRemaining) ? h : worst
  , null);

  return { score, bottleneck, perHabit };
}

// Typical days-to-automatic for each kind of change, used to translate
// a fit score into "days remaining to goal". Source: Lally et al. 2010
// for new-habit formation (~66 days average); quitting is treated as
// generally slower than starting; re-establishing a habit you've had
// before is treated as faster than either.
const TYPICAL_DAYS = {
  keep: 14,
  start: 66,
  quit: 90
};

function daysRemaining(choice, fit) {
  return Math.round(TYPICAL_DAYS[choice] * (1 - fit));
}
