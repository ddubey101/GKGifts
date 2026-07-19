// Product card used in grids and horizontal rails.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, shadow, spacing } from "./theme";
import { Price, Rating } from "./ui";
import { useCart } from "./cart-store";

export function ProductCard({ product, width }: { product: any; width?: number }) {
  const router = useRouter();
  const { toggleWishlist, isWished } = useCart();
  const wished = isWished(product.product_id);
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
        <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Price price={product.price} mrp={product.mrp} size={14} />
        <View style={{ marginTop: 4 }}>
          <Rating value={product.rating || 0} count={product.review_count} />
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
  brand: { fontSize: 11, color: colors.onSurfaceMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  name: { fontSize: 13, color: colors.onSurface, fontWeight: "500", minHeight: 32 },
});
