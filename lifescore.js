/*
  Life Score — core scoring logic
  Shared by results.html (and any future page) so the math never drifts apart.
*/

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/* ---------- Stage 1: instant score (no day data needed) ----------
   Shown right after the list is marked. This list is made entirely of
   things people want to let go of, so there's no "already doing it
   well" baseline to lean on. Instead: the fewer of these someone
   carries, the higher the starting score. Each marked item costs an
   equal share of the total 100 points.
*/
function quickScore(selectedCount, totalCount) {
  if (!totalCount) return null;
  const fraction = clamp01(selectedCount / totalCount);
  return Math.round(100 * (1 - fraction));
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

/*
  selectedHabits: array of { name } — items the person marked as
  "I have this and want to quit". totalCount: size of the full list
  they chose from (used to scale the score).
  Returns: {
    score: 0-100 or null,
    bottleneck: { name, choice, daysRemaining } or null,
    perHabit: [{ name, choice, daysRemaining }]
  }
*/
function instantAnalysis(selectedHabits, totalCount) {
  if (selectedHabits.length === 0) return { score: 100, bottleneck: null, perHabit: [] };

  const perHabit = selectedHabits.map(h => ({
    name: h.name,
    choice: 'quit',
    daysRemaining: daysRemaining('quit', 0)
  }));

  const score = quickScore(selectedHabits.length, totalCount);

  // With no behavior data yet, every selected item starts at the same
  // distance — pick the first one named as the one to call out.
  const bottleneck = perHabit[0];

  return { score, bottleneck, perHabit };
}
