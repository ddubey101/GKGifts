// Product card used in grids and horizontal rails.
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { colors, radius, shadow, spacing } from "./theme";
import { Price, Rating } from "./ui";
import { useCart } from "./cart-store";

export function ProductCard({ product, width }: { product: any; width?: number }) {
  const router = useRouter();
  const { toggleWishlist, isWished, addToCart, updateCart, cart } = useCart();
  const wished = isWished(product.product_id);

  const inCart = cart.items.find(
    (i) => i.product_id === product.product_id && !i.variant,
  );
  const qty = inCart?.quantity ?? 0;

  const [busy, setBusy] = useState(false);
  const stop = (e: any) => e?.stopPropagation?.();

  const runAdd = async (e: any) => {
    stop(e);
    if (busy) return;
    setBusy(true);
    try {
      await addToCart(product.product_id, 1, null);
      Haptics.selectionAsync().catch(() => {});
    } catch {
      // ignore; card still opens PDP on tap
    } finally {
      setBusy(false);
    }
  };

  const bump = async (e: any, delta: number) => {
    stop(e);
    if (busy) return;
    setBusy(true);
    try {
      const next = Math.max(0, qty + delta);
      await updateCart(product.product_id, next, null);
      Haptics.selectionAsync().catch(() => {});
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      testID={`product-card-${product.product_id}`}
      onPress={() => router.push(`/product/${product.product_id}`)}
      style={[styles.card, width ? { width } : { flex: 1 }]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: product.images?.[0] }} style={styles.image} contentFit="cover" transition={200} />
        <Pressable
          testID={`wishlist-toggle-${product.product_id}`}
          onPress={(e) => {
            stop(e);
            toggleWishlist(product.product_id).catch(() => {});
          }}
          style={styles.heart}
          hitSlop={8}
        >
          <Ionicons name={wished ? "heart" : "heart-outline"} size={18} color={wished ? colors.brandPrimary : colors.onSurface} />
        </Pressable>
      </View>
      <View style={{ padding: spacing.md, gap: 4 }}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Price price={product.price} mrp={product.mrp} size={14} />
        <View style={styles.metaRow}>
          <Rating value={product.rating || 0} count={product.review_count} />

          {qty === 0 ? (
            <Pressable
              testID={`card-add-to-cart-${product.product_id}`}
              onPress={runAdd}
              disabled={busy}
              style={styles.addBtn}
              hitSlop={6}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <>
                  <Ionicons name="bag-add" size={12} color={colors.onBrand} />
                  <Text style={styles.addBtnText}>Add</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.stepper} testID={`card-stepper-${product.product_id}`}>
              <Pressable
                testID={`card-qty-dec-${product.product_id}`}
                onPress={(e) => bump(e, -1)}
                disabled={busy}
                style={styles.stepBtn}
                hitSlop={6}
              >
                <Ionicons
                  name={qty === 1 ? "trash-outline" : "remove"}
                  size={14}
                  color={colors.onBrand}
                />
              </Pressable>
              <Text style={styles.stepQty} testID={`card-qty-${product.product_id}`}>{qty}</Text>
              <Pressable
                testID={`card-qty-inc-${product.product_id}`}
                onPress={(e) => bump(e, +1)}
                disabled={busy}
                style={styles.stepBtn}
                hitSlop={6}
              >
                <Ionicons name="add" size={14} color={colors.onBrand} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    overflow: "hidden",
    ...shadow.card,
  },
  imageWrap: { position: "relative", aspectRatio: 1, backgroundColor: colors.surfaceTertiary },
  image: { width: "100%", height: "100%" },
  heart: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 13, color: colors.onSurface, fontWeight: "500", minHeight: 32 },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    minHeight: 30,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    flexShrink: 0,
    minWidth: 56,
    justifyContent: "center",
  },
  addBtnText: { color: colors.onBrand, fontSize: 11, fontWeight: "600" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    borderRadius: 999,
    height: 28,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
  },
});
