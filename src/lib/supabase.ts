/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "missing-supabase-anon-key";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey
);

const url = supabaseUrl || fallbackUrl;
const key = supabaseAnonKey || fallbackKey;

/**
 * Vote-Survive does NOT use Supabase Auth.
 *
 * Providing accessToken prevents supabase-js from creating a GoTrue
 * auth client, which means:
 *
 * - no sb-*-auth-token localStorage entry
 * - no Navigator LockManager auth lock
 * - no GoTrueClient warnings
 *
 * Returning null causes supabase-js to fall back to the anon key
 * for normal PostgREST / RPC requests.
 */
export const supabase = createClient(url, key, {
  accessToken: async () => null,
}) as any;

type SupabaseClientInstance = any;

let cachedHostClient: SupabaseClientInstance | null = null;
let cachedHostPin: string | null = null;

/**
 * Host authorization is handled through our custom
 * x-vote-survive-host-pin header, not Supabase Auth.
 */
export function createHostSupabase(hostPin: string) {
  const normalizedPin = hostPin.trim();

  if (!normalizedPin) {
    throw new Error("Host session is missing.");
  }

  if (
    cachedHostClient &&
    cachedHostPin === normalizedPin
  ) {
    return cachedHostClient;
  }

  cachedHostPin = normalizedPin;

  cachedHostClient = createClient(url, key, {
    accessToken: async () => null,

    global: {
      headers: {
        "x-vote-survive-host-pin": normalizedPin,
      },
    },
  }) as any;

  return cachedHostClient;
}

export function getHostSupabase() {
  if (typeof window === "undefined") {
    throw new Error(
      "Host actions are only available in the browser."
    );
  }

  const stored = window.localStorage.getItem(
    "vote-survive-host-session"
  );

  if (!stored) {
    throw new Error(
      "Host session has expired. Re-open the room as host."
    );
  }

  try {
    const parsed = JSON.parse(stored) as {
      hostPin?: string;
    };

    if (!parsed.hostPin) {
      throw new Error("Host PIN missing.");
    }

    return createHostSupabase(parsed.hostPin);
  } catch {
    throw new Error(
      "Host session is invalid. Re-open the room as host."
    );
  }
}