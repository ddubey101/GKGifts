// Product card used in grids and horizontal rails.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { colors, radius, shadow, spacing } from "./theme";
import { Price, Rating } from "./ui";
import { useCart } from "./cart-store";

export function ProductCard({ product, width }: { product: any; width?: number }) {
  const router = useRouter();
  const { toggleWishlist, isWished, addToCart } = useCart();
  const wished = isWished(product.product_id);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const onAdd = async (e: any) => {
    e?.stopPropagation?.();
    if (adding || added) return;
    setAdding(true);
    try {
      await addToCart(product.product_id, 1, null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setAdded(true);
      setTimeout(() => setAdded(false), 1400);
    } catch {
      // swallow; PDP tap-through still available
    } finally {
      setAdding(false);
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
            e.stopPropagation();
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
          <Pressable
            testID={`card-add-to-cart-${product.product_id}`}
            onPress={onAdd}
            disabled={adding}
            style={[styles.addBtn, added && styles.addBtnAdded]}
            hitSlop={6}
          >
            <Ionicons
              name={added ? "checkmark" : "bag-add"}
              size={12}
              color={colors.onBrand}
            />
            <Text style={styles.addBtnText}>{added ? "Added" : "Add"}</Text>
          </Pressable>
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
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 0,
  },
  addBtnAdded: { backgroundColor: colors.success },
  addBtnText: { color: colors.onBrand, fontSize: 11, fontWeight: "600" },
});
