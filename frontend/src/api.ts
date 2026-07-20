// Thin API client for Gk Gifts.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
export const API_BASE = `${BASE}/api`;

const TOKEN_KEY = "aura_token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") return window.localStorage.getItem(TOKEN_KEY);
    return null;
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(v: string | null) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem(TOKEN_KEY, v);
    else window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (v) await SecureStore.setItemAsync(TOKEN_KEY, v);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function api<T = any>(
  path: string,
  opts: RequestInit & { auth?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };
  if (opts.auth !== false) {
    const tok = await getToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const ctrl = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 15000;
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers, signal: ctrl.signal });
  } catch (e: any) {
    clearTimeout(to);
    if (e?.name === "AbortError") {
      throw new Error("Network request timed out. Please check your connection.");
    }
    throw new Error(e?.message || "Network error");
  }
  clearTimeout(to);
  const text = await res.text();
  const data = text ? JSON.parse(text) : ({} as any);
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}
