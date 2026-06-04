import { createClient } from "@supabase/supabase-js";

// Las variables se definen en .env (local) y en Netlify (producción).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey);
