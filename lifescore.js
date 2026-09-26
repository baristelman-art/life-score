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

// Each individual habit has its own independent 21-day quitting streak —
// this is the only "days" number the app tracks per habit. A freedom
// category (Mental, Physical, ...) isn't free until every one of its
// habits has gone 21 clean days, so the category's displayed number is
// simply whichever of its habits still has the most days left to go.
const HABIT_STREAK_DAYS = 21;

// Highest a category's total can ever read (every one of its habits
// freshly marked), and the same summed across all four categories —
// used to scale charts and colors correctly since Mental (6 habits) can
// run much higher than Physical/Financial/Time (3 habits each).
const CATEGORY_MAX_DAYS = {};
Object.entries(FREEDOM_CATEGORIES).forEach(([key, cat]) => {
  CATEGORY_MAX_DAYS[key] = cat.items.length * HABIT_STREAK_DAYS;
});
const TOTAL_MAX_DAYS = Object.values(CATEGORY_MAX_DAYS).reduce((a, b) => a + b, 0);

// Calendar-day difference between two 'YYYY-MM-DD' strings (b − a), so a
// gap of several days without checking in still counts every day that
// passed, not just the days someone actually logged in.
function daysBetween(fromDateStr, toDateStr) {
  const a = new Date(fromDateStr + 'T00:00:00');
  const b = new Date(toDateStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

/*
  selectedNames: array of habit-name strings the person marked TODAY.
  lastMarkedMap: optional { habitName: 'YYYY-MM-DD', ... } — the most
    recent PRIOR date (before today) each habit was last marked, built
    from the person's full check-in history. Omit (or pass {}/null) for
    guests or anyone with no history — every habit is then treated as
    never marked before today.
  todayDateStr: today's date as 'YYYY-MM-DD' (local time).

  A habit marked today resets straight to 21. A habit not marked today
  keeps counting down from whenever it was last marked — one day lost
  for every calendar day that's passed, whether or not the person
  checked in on each of those days. A habit that's never been marked
  at all (ever) is already free: 0.

  Returns: {
    mental:   { label, emoji, color, marked, total, days },
    physical: { ... },
    financial:{ ... },
    temporal: { ... }
  }
*/
function computeFreedomDays(selectedNames, lastMarkedMap, todayDateStr) {
  const selectedSet = new Set(selectedNames);
  const lastMarked = { ...(lastMarkedMap || {}) };
  const today = todayDateStr || new Date().toLocaleDateString('en-CA');

  // Marking a habit today resets its clock, regardless of any past history.
  selectedSet.forEach(name => { lastMarked[name] = today; });

  const result = {};

  Object.entries(FREEDOM_CATEGORIES).forEach(([key, cat]) => {
    const marked = cat.items.filter(item => selectedSet.has(item)).length;
    const total = cat.items.length;

    const habitDays = cat.items.map(item => {
      const lastDate = lastMarked[item];
      if (!lastDate) return 0; // never marked at all — already free
      const daysSince = daysBetween(lastDate, today);
      return Math.max(0, HABIT_STREAK_DAYS - daysSince);
    });

    // The category's total is the sum of every one of its habits' own
    // running scores — mark 2 of 6 Mental habits for the first time and
    // Mental reads 42 (2 × 21); each habit then decays on its own and
    // refills to 21 the moment it's marked again (new or repeat, same rule).
    const days = habitDays.reduce((sum, d) => sum + d, 0);

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
