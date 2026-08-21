const { createClient } = require('@supabase/supabase-js');

// Service-role key -- server-only, never sent to the browser. Used to verify
// tokens the client got from its own (anon-key) Supabase Auth session.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabaseAdmin;
