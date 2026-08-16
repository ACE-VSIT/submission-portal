import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Supabase is the primary backend: auth (Google OAuth), database and RLS.
 * The client is only ever configured with the public anon key — the anon key
 * is safe to expose because Row Level Security enforces every read/write.
 */
export const supabase = createClient(
    supabaseUrl ?? "https://placeholder.supabase.co",
    supabaseAnonKey ?? "placeholder",
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    }
);
