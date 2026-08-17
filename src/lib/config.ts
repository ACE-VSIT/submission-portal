export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const APP_NAME = "ACE";
export const APP_NAME_LONG = "ACE Submission Portal";

/** Max PDF size accepted by the storage layer (matches the edge function). */
export const MAX_PDF_SIZE_MB = 10;
export const MAX_LINKS = 5;
