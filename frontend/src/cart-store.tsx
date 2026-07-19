// Lightweight cart + wishlist store synced to backend.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

type Ctx = {
  cart: Cart;
  wishlist: string[];
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

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(empty);
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

  useEffect(() => {
    refreshCart();
    refreshWishlist();
  }, [refreshCart, refreshWishlist]);

  const addToCart = async (product_id: string, quantity = 1, variant: string | null = null) => {
    const c = await api<Cart>("/cart/add", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity, variant }),
    });
    setCart(c);
  };
  const updateCart = async (product_id: string, quantity: number, variant: string | null = null) => {
    const c = await api<Cart>("/cart/update", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity, variant }),
    });
    setCart(c);
  };
  const clearCart = async () => {
    await api("/cart/clear", { method: "POST" });
    setCart(empty);
  };
  const toggleWishlist = async (product_id: string) => {
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
      value={{ cart, wishlist, refreshCart, refreshWishlist, addToCart, updateCart, clearCart, toggleWishlist, isWished }}
    >
      {children}
    </CartCtx.Provider>
  );
}
