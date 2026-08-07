import { createClient } from "@supabase/supabase-js";

// Server-only client — uses the service role key, never sent to the browser.
// Only import this from pages/api/*.
let client = null;

export function supabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
