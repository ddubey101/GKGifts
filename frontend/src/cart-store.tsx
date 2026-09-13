// Lightweight cart + wishlist store synced to backend.
// Guests get a locally persisted cart; it is merged into the server cart
// as soon as they sign in (which now happens at checkout).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";
import { useAuth } from "./auth";

export type CartItem = {
  product_id: string;
  quantity: number;
  variant?: string | null;
  product: any;
  line_total: number;
};
export type Cart = {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  count: number;
};

const empty: Cart = { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0, count: 0 };

const GUEST_KEY = "gk_guest_cart";

type GuestLine = { product_id: string; quantity: number; variant?: string | null };

async function readGuest(): Promise<GuestLine[]> {
  try {
    const raw =
      Platform.OS === "web"
        ? typeof window !== "undefined"
          ? window.localStorage.getItem(GUEST_KEY)
          : null
        : await SecureStore.getItemAsync(GUEST_KEY);
    return raw ? (JSON.parse(raw) as GuestLine[]) : [];
  } catch {
    return [];
  }
}

async function writeGuest(lines: GuestLine[]) {
  try {
    const raw = JSON.stringify(lines);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.setItem(GUEST_KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(GUEST_KEY, raw);
  } catch {}
}

async function clearGuest() {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(GUEST_KEY);
  } catch {}
}

// Mirrors the backend totals logic so guest and signed-in carts agree.
async function hydrateGuest(lines: GuestLine[]): Promise<Cart> {
  if (lines.length === 0) return empty;
  const products = await Promise.all(
    lines.map((l) =>
      api<any>(`/products/${l.product_id}`, { auth: false }).catch(() => null)
    )
  );
  const items: CartItem[] = [];
  let subtotal = 0;
  lines.forEach((l, i) => {
    const p = products[i];
    if (!p) return;
    const line_total = Math.round(p.price * l.quantity * 100) / 100;
    subtotal += line_total;
    items.push({ ...l, product: p, line_total });
  });
  const shipping = subtotal >= 499 || subtotal === 0 ? 0 : 49;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    shipping,
    tax: 0,
    total: Math.round((subtotal + shipping) * 100) / 100,
    count: items.reduce((n, i) => n + i.quantity, 0),
  };
}

type Ctx = {
  cart: Cart;
  wishlist: string[];
  isGuestCart: boolean;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  addToCart: (product_id: string, quantity?: number, variant?: string | null) => Promise<void>;
  updateCart: (product_id: string, quantity: number, variant?: string | null) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleWishlist: (product_id: string) => Promise<boolean>;
  isWished: (product_id: string) => boolean;
};

const CartCtx = createContext<Ctx>({} as any);
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(empty);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const merged = useRef(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(await hydrateGuest(await readGuest()));
      return;
    }
    try {
      const c = await api<Cart>("/cart");
      setCart(c);
    } catch {
      setCart(empty);
    }
  }, [user]);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlist([]);
      return;
    }
    try {
      const items = await api<any[]>("/wishlist");
      setWishlist(items.map((i) => i.product_id));
    } catch {
      setWishlist([]);
    }
  }, [user]);

  // On sign-in, push anything the guest collected into the server cart.
  useEffect(() => {
    (async () => {
      if (!user) {
        merged.current = false;
        await refreshCart();
        await refreshWishlist();
        return;
      }
      if (!merged.current) {
        merged.current = true;
        const lines = await readGuest();
        for (const l of lines) {
          try {
            await api("/cart/add", {
              method: "POST",
              body: JSON.stringify({
                product_id: l.product_id,
                quantity: l.quantity,
                variant: l.variant ?? null,
              }),
            });
          } catch {}
        }
        if (lines.length) await clearGuest();
      }
      await refreshCart();
      await refreshWishlist();
    })();
  }, [user, refreshCart, refreshWishlist]);

  const addToCart = async (product_id: string, quantity = 1, variant: string | null = null) => {
    if (!user) {
      const [lines, product] = await Promise.all([
        readGuest(),
        api<any>(`/products/${product_id}`, { auth: false }),
      ]);
      const hit = lines.find((l) => l.product_id === product_id && (l.variant ?? null) === variant);
      const requested = lines
        .filter((l) => l.product_id === product_id)
        .reduce((total, l) => total + l.quantity, 0) + quantity;
      const available = Math.max(0, Number(product.stock) || 0);
      if (requested > available) {
        throw new Error(available === 0 ? "This product is out of stock" : `Only ${available} item(s) available`);
      }
      if (hit) hit.quantity = requested;
      else lines.push({ product_id, quantity, variant });
      await writeGuest(lines);
      setCart(await hydrateGuest(lines));
      return;
    }
    const c = await api<Cart>("/cart/add", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity, variant }),
    });
    setCart(c);
  };

  const updateCart = async (product_id: string, quantity: number, variant: string | null = null) => {
    if (!user) {
      const current = await readGuest();
      let lines = current.filter(
        (l) => !(l.product_id === product_id && (l.variant ?? null) === variant)
      );
      if (quantity > 0) {
        const product = await api<any>(`/products/${product_id}`, { auth: false });
        const available = Math.max(0, Number(product.stock) || 0);
        const requested = quantity + lines
          .filter((l) => l.product_id === product_id)
          .reduce((total, l) => total + l.quantity, 0);
        if (requested > available) {
          throw new Error(available === 0 ? "This product is out of stock" : `Only ${available} item(s) available`);
        }
        lines.push({ product_id, quantity, variant });
      }
      await writeGuest(lines);
      setCart(await hydrateGuest(lines));
      return;
    }
    const c = await api<Cart>("/cart/update", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity, variant }),
    });
    setCart(c);
  };

  const clearCart = async () => {
    if (!user) {
      await clearGuest();
      setCart(empty);
      return;
    }
    await api("/cart/clear", { method: "POST" });
    setCart(empty);
  };

  const toggleWishlist = async (product_id: string) => {
    if (!user) return false;
    const r = await api<{ added: boolean; product_ids: string[] }>("/wishlist/toggle", {
      method: "POST",
      body: JSON.stringify({ product_id }),
    });
    setWishlist(r.product_ids);
    return r.added;
  };
  const isWished = (pid: string) => wishlist.includes(pid);

  return (
    <CartCtx.Provider
      value={{
        cart,
        wishlist,
        isGuestCart: !user,
        refreshCart,
        refreshWishlist,
        addToCart,
        updateCart,
        clearCart,
        toggleWishlist,
        isWished,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}
