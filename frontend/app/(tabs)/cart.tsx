import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useCart } from "@/src/cart-store";
import { useAuth } from "@/src/auth";
import { Button, EmptyState, Price } from "@/src/ui";
import { AppHeader } from "@/src/app-header";

export default function Cart() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateCart, refreshCart } = useCart();

  React.useEffect(() => { refreshCart(); }, [refreshCart]);

  if (!user) return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Sign in to view cart" cta="Login" onCta={() => router.push("/(auth)/login")} /></SafeAreaView>;

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
        <AppHeader title="Cart" showNotifications={false} showWishlist={false} hPad={spacing.lg} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState title="Your cart is empty" subtitle="Explore great deals to fill it up" cta="Start shopping" onCta={() => router.push("/(tabs)/home")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <AppHeader title="Cart" showNotifications={false} showWishlist={false} hPad={spacing.lg} />
      <FlatList
        data={cart.items}
        keyExtractor={(i) => i.product_id + (i.variant || "")}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200, gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={s.row} testID={`cart-item-${item.product_id}`}>
            <Pressable onPress={() => router.push(`/product/${item.product_id}`)}>
              <Image source={{ uri: item.product.images?.[0] }} style={s.thumb} contentFit="cover" />
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontWeight: "500", color: colors.onSurface }} numberOfLines={2}>{item.product.name}</Text>
              {!!item.variant && <Text style={{ fontSize: 12, color: colors.onSurfaceMuted }}>Variant: {item.variant}</Text>}
              <Price price={item.product.price} mrp={item.product.mrp} size={14} />
              <View style={s.qty}>
                <Pressable testID={`qty-dec-${item.product_id}`} onPress={() => updateCart(item.product_id, item.quantity - 1, item.variant)} style={s.qtyBtn}><Ionicons name="remove" size={16} color={colors.onSurface} /></Pressable>
                <Text style={{ minWidth: 20, textAlign: "center", fontWeight: "500" }}>{item.quantity}</Text>
