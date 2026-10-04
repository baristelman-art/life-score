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

/* ======================================================================
   The level game
   ----------------------------------------------------------------------
   Each freedom (Mental, Physical, Financial, Time) climbs its own ladder,
   all four in parallel. A freedom moves up as its clean streak grows:

     Level 1 = 1 clean day   Level 2 = 3   Level 3 = 7
     Level 4 = 13            Level 5 = 21

   A "clean day" is any calendar day on which none of that freedom's
   habits were marked — days the person didn't check in at all count as
   clean too. Marking one of its habits again drops that freedom ONE
   level, and its streak picks up from the start of the level it fell to
   (fall from Level 3 to Level 2 and you're back at 3 clean days, needing
   4 more to reach Level 3 again).

   The game starts on the person's first check-in (or on the day they
   pressed "Restart game"). That first day itself is day 0 for everyone.
   ====================================================================== */

const LEVEL_THRESHOLDS = [1, 3, 7, 13, 21];
const MAX_LEVEL = LEVEL_THRESHOLDS.length;
const FREEDOM_KEYS = ['mental', 'physical', 'financial', 'temporal'];
const FREEDOM_SHORT_LABELS = { mental: 'Mental', physical: 'Physical', financial: 'Financial', temporal: 'Time' };

// habit name → freedom key
const HABIT_TO_FREEDOM = {};
Object.entries(FREEDOM_CATEGORIES).forEach(([key, cat]) => {
  cat.items.forEach(name => { HABIT_TO_FREEDOM[name] = key; });
});

function localDateStr(d) {
  return (d || new Date()).toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/*
  Turns saved report rows into { 'YYYY-MM-DD': Set(habitNames) }.
  rows: [{ created_at, habits: [{ name }] }]
  sinceDateStr (optional): ignore anything before this date (game restart).
  skipDateStr (optional): ignore rows on this date (used for "today", which
    is replaced by what the person is marking right now).
*/
function buildDayMarks(rows, sinceDateStr, skipDateStr) {
  const marks = {};
  (rows || []).forEach(row => {
    const day = localDateStr(new Date(row.created_at));
    if (sinceDateStr && day < sinceDateStr) return;
    if (skipDateStr && day === skipDateStr) return;
    if (!marks[day]) marks[day] = new Set();
    (row.habits || []).forEach(h => marks[day].add(h.name));
  });
  return marks;
}

// Earliest day the game counts from.
function gameStartDate(dayMarks, restartDateStr, todayStr) {
  const days = Object.keys(dayMarks).sort();
  let start = days.length ? days[0] : todayStr;
  if (restartDateStr && restartDateStr > start) start = restartDateStr;
  if (start > todayStr) start = todayStr;
  return start;
}

/*
  dayMarks: { 'YYYY-MM-DD': Set(habitNames) } — include today's marks.
  startDateStr / todayStr: 'YYYY-MM-DD'.

  Returns { mental: {...}, physical: {...}, financial: {...}, temporal: {...} }
  each with:
    level        0–5
    cleanDays    current streak used for the ladder
    nextAt       clean days needed for the next level (null at Level 5)
    toNext       days still to go for the next level (null at Level 5)
    markedToday  true if one of its habits is marked today
    levelBefore  level at the end of yesterday (to spot drops / level-ups)
*/
function computeLevels(dayMarks, startDateStr, todayStr) {
  const today = todayStr || localDateStr();
  const start = startDateStr && startDateStr <= today ? startDateStr : today;
  const result = {};

  FREEDOM_KEYS.forEach(key => {
    let level = 0;
    let clean = 0;
    let levelBefore = 0;

    const markedOn = day => {
      const set = dayMarks[day];
      if (!set) return false;
      for (const name of set) if (HABIT_TO_FREEDOM[name] === key) return true;
      return false;
    };

    for (let day = start; day <= today; day = addDays(day, 1)) {
      if (day === today) levelBefore = level;
      if (day === start) continue; // first day of the game is day 0
      if (markedOn(day)) {
        level = Math.max(0, level - 1);
        clean = level > 0 ? LEVEL_THRESHOLDS[level - 1] : 0;
      } else {
        clean += 1;
        while (level < MAX_LEVEL && clean >= LEVEL_THRESHOLDS[level]) level += 1;
      }
    }

    const nextAt = level < MAX_LEVEL ? LEVEL_THRESHOLDS[level] : null;
    result[key] = {
      key,
      label: FREEDOM_SHORT_LABELS[key],
      emoji: FREEDOM_CATEGORIES[key].emoji,
      color: FREEDOM_CATEGORIES[key].color,
      level,
      cleanDays: clean,
      nextAt,
      toNext: nextAt === null ? null : nextAt - clean,
      markedToday: markedOn(today),
      levelBefore
    };
  });

  return result;
}

// Each level is a growth stage — a freedom grows like a tree while it's
// left unmarked, and shrinks back one stage when it's marked again.
const STAGES = [
  { emoji: '🌰', name: 'Seed' },        // Level 0 — planted, game started
  { emoji: '🌱', name: 'Sprout' },      // Level 1 — 1 clean day
  { emoji: '🌿', name: 'Sapling' },     // Level 2 — 3 clean days
  { emoji: '🪴', name: 'Young tree' },  // Level 3 — 7 clean days
  { emoji: '🌳', name: 'Tree' },        // Level 4 — 13 clean days
  { emoji: '🌲', name: 'Forest' }       // Level 5 — 21 clean days
];

const GROW_RULE = "Don't mark it tomorrow, it grows. Mark it, it shrinks.";

function stageOf(level) { return STAGES[Math.max(0, Math.min(MAX_LEVEL, level))]; }

// One short status line for a freedom's card.
function levelStatusText(f) {
  const next = f.level < MAX_LEVEL ? stageOf(f.level + 1).name.toLowerCase() : null;
  if (f.level === MAX_LEVEL) return f.markedToday ? 'Marked today' : 'Fully grown 🎉';
  if (f.markedToday && f.level < f.levelBefore) return `Marked today · shrank to ${stageOf(f.level).name.toLowerCase()}`;
  if (f.markedToday) return `Marked today · leave it tomorrow to ${f.level === 0 ? 'sprout' : 'grow'}`;
  if (f.cleanDays === 0) return 'Planted · sprouts tomorrow';
  if (f.level > f.levelBefore) return `Grew today! ${f.toNext} more ${f.toNext === 1 ? 'day' : 'days'} to ${next}`;
  return `${f.toNext} more ${f.toNext === 1 ? 'day' : 'days'} to ${next}`;
}

// Progress (0–1) through the current stage toward the next one.
function levelProgress(f) {
  if (f.level === MAX_LEVEL) return 1;
  const from = f.level > 0 ? LEVEL_THRESHOLDS[f.level - 1] : 0;
  const to = LEVEL_THRESHOLDS[f.level];
  return Math.max(0, Math.min(1, (f.cleanDays - from) / (to - from)));
}

// Renders the four growth cards into a container element.
function renderLevelCards(containerEl, levels) {
  containerEl.innerHTML = FREEDOM_KEYS.map(key => {
    const f = levels[key];
    const st = stageOf(f.level);
    const pct = Math.round(levelProgress(f) * 100);
    const tag = f.level > f.levelBefore ? '<span class="lv-tag up">▲ grew</span>'
              : f.level < f.levelBefore ? '<span class="lv-tag down">▼ shrank</span>' : '';
    return `
      <div class="lv-card${f.markedToday ? ' marked' : ''}" style="--cat-color:${f.color}">
        <div class="lv-top"><span class="lv-emoji">${f.emoji}</span><span class="lv-name">${f.label}</span>${tag}</div>
        <div class="lv-stage"><span class="lv-plant">${st.emoji}</span><span class="lv-stage-name">${st.name}</span></div>
        <div class="lv-bar"><span style="width:${pct}%"></span></div>
        <p class="lv-status">${levelStatusText(f)}</p>
      </div>`;
  }).join('');
}

// Shared styles for the growth cards (injected once by whichever page uses them).
(function injectLevelStyles() {
  if (typeof document === 'undefined' || document.getElementById('lv-styles')) return;
  const css = `
  .lv-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.6rem; }
  .lv-card { --cat-color: var(--teal); background: var(--surface); border:1px solid var(--line); border-radius:16px; padding:0.9rem 0.9rem 0.8rem; text-align:left; }
  .lv-card.marked { border-color:#D9534F55; }
  .lv-top { display:flex; align-items:center; gap:0.4rem; margin-bottom:0.5rem; }
  .lv-emoji { font-size:1rem; line-height:1; }
  .lv-name { font-size:0.7rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--cat-color); }
  .lv-tag { margin-left:auto; font-family:'Space Mono',monospace; font-size:0.62rem; padding:0.1rem 0.4rem; border-radius:999px; white-space:nowrap; }
  .lv-tag.up { color:#4CAF7D; background:#4CAF7D22; }
  .lv-tag.down { color:#D9534F; background:#D9534F22; }
  .lv-stage { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.6rem; }
  .lv-plant { font-size:2rem; line-height:1; }
  .lv-stage-name { font-family:'Fraunces',serif; font-size:1.1rem; color:var(--text); }
  .lv-bar { height:4px; border-radius:2px; background:var(--line); overflow:hidden; margin-bottom:0.55rem; }
  .lv-bar span { display:block; height:100%; background:var(--cat-color); }
  .lv-status { font-size:0.76rem; color:var(--text-mute); line-height:1.35; margin:0; }
  .grow-rule { font-size:0.9rem; color:var(--text); margin-top:0.9rem; text-align:center; }
  .grow-more { margin-top:0.6rem; text-align:center; }
  .grow-more summary { cursor:pointer; font-size:0.8rem; color:var(--text-mute); list-style:none; display:inline-block; }
  .grow-more summary::-webkit-details-marker { display:none; }
  .grow-more summary:hover { color:var(--teal); }
  .grow-ladder { display:flex; justify-content:center; flex-wrap:wrap; gap:0.3rem; margin-top:0.7rem; }
  .grow-step { font-size:0.72rem; color:var(--text-mute); border:1px solid var(--line); border-radius:999px; padding:0.25rem 0.55rem; white-space:nowrap; }
  .grow-step b { color:var(--text); font-weight:600; }
  .grow-note { font-size:0.78rem; color:var(--text-mute); margin-top:0.6rem; line-height:1.5; }`;
  const el = document.createElement('style');
  el.id = 'lv-styles';
  el.textContent = css;
  (document.head || document.documentElement).appendChild(el);
})();

// The one-line rule plus a tap-to-open "how fast" ladder.
function levelLadderHtml() {
  const steps = STAGES.slice(1).map((st, i) =>
    `<span class="grow-step">${st.emoji} ${st.name} <b>${LEVEL_THRESHOLDS[i]}d</b></span>`).join('');
  return `
    <p class="grow-rule">${GROW_RULE}</p>
    <details class="grow-more">
      <summary>How fast do they grow? ⓘ</summary>
      <div class="grow-ladder">${steps}</div>
      <p class="grow-note">Clean days in a row. Days you don't visit count as clean. A slip only shrinks it one stage — never back to zero.</p>
    </details>`;
}

/* ---------- Accounts: email + password, with an email code if forgotten ----------
   Joining and logging in use the same form. If the email + password match
   an account, they're logged in; if the email is new, an account is
   created. Forgot the password? We email a 6-digit code, they type it in
   with a new password, and they're back in. */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

// Returns { user, isNewAccount }.
async function signInOrSignUp(email, password) {
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.');
  if (!password || password.length < 6) throw new Error('Password needs at least 6 characters.');

  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (!signInError && signInData && signInData.user) return { user: signInData.user, isNewAccount: false };

  const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
  const alreadyRegistered = (signUpError && /already|registered|exists/i.test(signUpError.message || ''))
    || (signUpData && signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0);
  if (alreadyRegistered) {
    throw new Error('That email already has an account and the password doesn\'t match. Tap "Forgot password?" below.');
  }
  if (signUpError) throw new Error(signUpError.message);
  if (!signUpData || !signUpData.session) {
    throw new Error('Account created — check your email to confirm it, then log in.');
  }
  return { user: signUpData.user, isNewAccount: true };
}

// Step 1 of "Forgot password?": email a 6-digit code to an existing account.
async function sendResetCode(email) {
  if (!isValidEmail(email)) throw new Error('Enter your email above first.');
  const { error } = await supabaseClient.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('signup') || m.includes('not found') || m.includes('not allowed')) {
      throw new Error('There is no account with that email yet — just pick a password to join.');
    }
    if (m.includes('rate') || m.includes('seconds')) throw new Error('Too many codes requested — wait a minute and try again.');
    throw new Error(error.message);
  }
}

// Step 2: check the code, set the new password. Returns the user.
async function resetWithCode(email, code, newPassword) {
  const token = String(code || '').replace(/\D/g, '');
  if (token.length < 6) throw new Error('Enter the 6-digit code from the email.');
  if (!newPassword || newPassword.length < 6) throw new Error('New password needs at least 6 characters.');
  const { data, error } = await supabaseClient.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data || !data.user) throw new Error("That code didn't work — check it or request a new one.");
  const { data: upd, error: updError } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (updError) throw new Error(updError.message);
  return (upd && upd.user) || data.user;
}

// Date the person last pressed "Restart game", if ever.
function restartDateOf(user) {
  return (user && user.user_metadata && user.user_metadata.game_start) || null;
}
