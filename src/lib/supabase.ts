/* eslint-disable @typescript-eslint/no-explicit-any */

// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "missing-supabase-anon-key";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey
) as any;

type SupabaseClientInstance = any;

let cachedHostClient: SupabaseClientInstance | null = null;
let cachedHostPin: string | null = null;

export function createHostSupabase(hostPin: string) {
  const normalizedPin = hostPin.trim();
  if (!normalizedPin) {
    throw new Error("Host session is missing.");
  }

  if (cachedHostClient && cachedHostPin === normalizedPin) {
    return cachedHostClient;
  }

  cachedHostPin = normalizedPin;
  cachedHostClient = createClient(
    supabaseUrl || fallbackUrl,
    supabaseAnonKey || fallbackKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: `vote-survive-host-auth:${normalizedPin}`,
      },
      global: {
        headers: {
          "x-vote-survive-host-pin": normalizedPin,
        },
      },
    }
  ) as any;

  return cachedHostClient;
}

export function getHostSupabase() {
  if (typeof window === "undefined") {
    throw new Error("Host actions are only available in the browser.");
  }

  const stored = window.localStorage.getItem("vote-survive-host-session");
  if (!stored) {
    throw new Error("Host session has expired. Re-open the room as host.");
  }

  try {
    const parsed = JSON.parse(stored) as { hostPin?: string };
    if (!parsed.hostPin) throw new Error("Host PIN missing.");
    return createHostSupabase(parsed.hostPin);
  } catch {
    throw new Error("Host session is invalid. Re-open the room as host.");
  }
}
