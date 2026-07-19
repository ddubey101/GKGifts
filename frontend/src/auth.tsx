// Auth context: JWT (email/password) + Emergent Google session.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, setToken, getToken } from "./api";

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as any);
export const useAuth = () => useContext(AuthCtx);

const AUTH_URL = "https://auth.emergentagent.com/";
const SESSION_DATA_URL =
  "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const tok = await getToken();
      if (!tok) {
        setUser(null);
        return;
      }
      const me = await api<User>("/auth/me");
      setUser(me);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  const processSessionId = useCallback(async (sessionId: string) => {
    const r = await fetch(SESSION_DATA_URL, { headers: { "X-Session-ID": sessionId } });
    if (!r.ok) throw new Error("Google session invalid");
    const data = await r.json();
    const backend = await api<{ token: string; user: User }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ session_token: data.session_token || sessionId }),
      auth: false,
    });
    await setToken(backend.token);
    setUser(backend.user);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Web cold-start: parse #session_id or ?session_id
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const hash = window.location.hash || "";
          const search = window.location.search || "";
          const m =
            hash.match(/session_id=([^&]+)/) || search.match(/session_id=([^&]+)/);
          if (m) {
            await processSessionId(decodeURIComponent(m[1]));
            window.history.replaceState(null, "", window.location.pathname);
            setLoading(false);
            return;
          }
        } else {
          const initial = await Linking.getInitialURL();
          if (initial) {
            const m = initial.match(/session_id=([^&]+)/);
            if (m) {
              await processSessionId(decodeURIComponent(m[1]));
              setLoading(false);
              return;
            }
          }
        }
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh, processSessionId]);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    await setToken(r.token);
    setUser(r.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const r = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
      auth: false,
    });
    await setToken(r.token);
    setUser(r.user);
  };

  const googleLogin = async () => {
    const redirect =
      Platform.OS === "web"
        ? window.location.origin + "/"
        : Linking.createURL("");
    const authUrl = `${AUTH_URL}?redirect=${encodeURIComponent(redirect)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
    if (result.type !== "success" || !result.url) return;
    const m = result.url.match(/session_id=([^&]+)/);
    if (!m) throw new Error("No session_id in redirect");
    await processSessionId(decodeURIComponent(m[1]));
  };

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    await setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, googleLogin, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}
