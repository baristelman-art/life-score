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

/* ---------- The 4 Freedoms ----------
   Every item in the 15-item list feeds exactly one of four freedoms.
   Days-to-freedom for a category is 90 (the "quit" timeline) scaled by
   how many of that category's items are currently marked — 0 marked
   means that freedom is already effectively won.
*/
const FREEDOM_CATEGORIES = {
  mental: {
    label: 'Mental Freedom',
    emoji: '🧠',
    color: '#7DA3D6',
    items: ['Overthinking', 'Obsessing Over Others', 'Dwelling on the Past', 'Worrying About the Future', 'Negative Feelings', 'Pornography']
  },
  physical: {
    label: 'Physical Freedom',
    emoji: '💪',
    color: '#5FAFA4',
    items: ['Overeating', 'Unhealthy Eating & Drinking', 'Alcohol, Smoking & Drugs']
  },
  financial: {
    label: 'Financial Freedom',
    emoji: '💰',
    color: '#E8B04B',
    items: ['Attachment to Possessions', 'Gambling', 'Unnecessary Spending']
  },
  temporal: {
    label: 'Time Freedom',
    emoji: '⏳',
    color: '#B98AE0',
    items: ['Impulsive Behavior', 'Laziness & Procrastination', 'Social Media & Gaming Addiction']
  }
};

const FREEDOM_BASE_DAYS = 90;

/*
  selectedNames: array of habit-name strings the person marked today.
  Returns: {
    mental:   { label, emoji, color, marked, total, days },
    physical: { ... },
    financial:{ ... },
    temporal: { ... }
  }
*/
function computeFreedomDays(selectedNames) {
  const selectedSet = new Set(selectedNames);
  const result = {};

  Object.entries(FREEDOM_CATEGORIES).forEach(([key, cat]) => {
    const marked = cat.items.filter(item => selectedSet.has(item)).length;
    const total = cat.items.length;
    const days = Math.round(FREEDOM_BASE_DAYS * (marked / total));
    result[key] = { label: cat.label, emoji: cat.emoji, color: cat.color, marked, total, days };
  });

  return result;
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
