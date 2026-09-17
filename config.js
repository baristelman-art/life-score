/*
  Life Score — Supabase connection
  Loaded on every page that needs auth or data (results.html, history.html).
  Requires the Supabase JS library to be loaded first:
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
*/

const SUPABASE_URL = 'https://hozweodhkxszaoaxpzgj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DQeJWW8VqBRQPipoM-XnBQ_0-TXZeJo';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nickname-only accounts, built on top of Supabase's real email/password
// auth. We turn the nickname into a fake, never-emailed address so we can
// use Supabase Auth's real password hashing and session handling without
// asking anyone for an email.
function nicknameToEmail(nickname) {
  return nickname.trim().toLowerCase().replace(/\s+/g, '-') + '@users.lifescore.app';
}
