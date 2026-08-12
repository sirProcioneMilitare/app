import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client server-side unico, con la service role key. Non deve mai essere
// importato da codice che gira nel browser. Inizializzato in modo lazy cosi'
// il build non fallisce se le env var non sono presenti in quel momento
// (lo sono sempre a runtime, su Vercel).
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere impostate."
    );
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}
