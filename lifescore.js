/*
  Life Score — the 4 Freedoms
  Shared by every page so the math never drifts apart.

  There is no numeric "score" anymore. Instead, everything the person
  marks (things they want to let go of) feeds into one of four
  freedoms: Mental, Physical, Financial, Time. Each freedom reports how
  many days stand between the person and being free of it.
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

// Days-to-freedom for a category is this base, scaled by how many of
// that category's items are currently marked — 0 marked means that
// freedom is already effectively won (0 days).
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

// Sum of all four freedoms' days — a single "total distance to full
// freedom" number, used only for the history trend chart. Lower is
// better (0 means every freedom is already won).
function totalFreedomDays(freedomResult) {
  return Object.values(freedomResult).reduce((sum, f) => sum + f.days, 0);
}

// A blue (low/good) → red (high/bad) color scale for any "days" value,
// used to color chart bars and numbers so bigger distances visibly feel
// more urgent. value/max both in days; result is an hsl() string.
function freedomColorScale(value, max) {
  const t = Math.max(0, Math.min(1, value / max));
  const hue = Math.round(210 - t * 210); // 210 = blue, 0 = red
  return `hsl(${hue}, 75%, 58%)`;
}
