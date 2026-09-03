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

export default function Cart() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateCart, refreshCart } = useCart();

  React.useEffect(() => { refreshCart(); }, [refreshCart]);

  if (!user) return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Sign in to view cart" cta="Login" onCta={() => router.push("/(auth)/login")} /></SafeAreaView>;

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
        <View style={[s.centerRow, { paddingHorizontal: hPad, backgroundColor: colors.surface }]}>
        <View style={[s.headerInner, { maxWidth: contentMax }]}>
          <Pressable testID="home-logo" onPress={() => router.push("/(tabs)/home")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <RNImage
              source={require("../../assets/images/gk-logo.png")}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
            <View>
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>Hello,</Text>
              <Text style={{ ...typography.h3, color: colors.onSurface }}>{user?.name || "Shopper"}</Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable testID="header-notifications" onPress={() => router.push("/notifications")} style={s.headerBtn}>
              <Ionicons name="notifications-outline" size={20} color={colors.onSurface} />
            </Pressable>
            <Pressable testID="header-wishlist" onPress={() => router.push("/wishlist")} style={s.headerBtn}>
              <Ionicons name="heart-outline" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>
      </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState title="Your cart is empty" subtitle="Explore great deals to fill it up" cta="Start shopping" onCta={() => router.push("/(tabs)/home")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={s.header}>
        <View style={[s.centerRow, { paddingHorizontal: hPad, backgroundColor: colors.surface }]}>
        <View style={[s.headerInner, { maxWidth: contentMax }]}>
          <Pressable testID="home-logo" onPress={() => router.push("/(tabs)/home")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <RNImage
              source={require("../../assets/images/gk-logo.png")}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
            <View>
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>Hello,</Text>
              <Text style={{ ...typography.h3, color: colors.onSurface }}>{user?.name || "Shopper"}</Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable testID="header-notifications" onPress={() => router.push("/notifications")} style={s.headerBtn}>
              <Ionicons name="notifications-outline" size={20} color={colors.onSurface} />
            </Pressable>
            <Pressable testID="header-wishlist" onPress={() => router.push("/wishlist")} style={s.headerBtn}>
              <Ionicons name="heart-outline" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>
      </View>
        <Text style={{ color: colors.onSurfaceMuted }}>{cart.count} items</Text>
      </View>
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
                <Pressable testID={`qty-inc-${item.product_id}`} onPress={() => updateCart(item.product_id, item.quantity + 1, item.variant)} style={s.qtyBtn}><Ionicons name="add" size={16} color={colors.onSurface} /></Pressable>
                <Pressable testID={`qty-del-${item.product_id}`} onPress={() => updateCart(item.product_id, 0, item.variant)} style={{ marginLeft: "auto", padding: 6 }}><Ionicons name="trash-outline" size={18} color={colors.onSurfaceMuted} /></Pressable>
              </View>
            </View>
          </View>
        )}
      />

      <View style={s.footer}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.onSurfaceMuted }}>Subtotal</Text>
          <Text style={{ fontWeight: "500" }}>₹{cart.subtotal.toLocaleString("en-IN")}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.onSurfaceMuted }}>Shipping</Text>
          <Text>{cart.shipping === 0 ? "Free" : `₹${cart.shipping}`}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.onSurfaceMuted }}>Tax (5%)</Text>
          <Text>₹{cart.tax}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "500", fontSize: 16 }}>Total</Text>
          <Text style={{ fontWeight: "500", fontSize: 16 }}>₹{cart.total.toLocaleString("en-IN")}</Text>
        </View>
        <Button testID="checkout-cta" title="Proceed to Checkout" onPress={() => router.push("/checkout")} style={{ marginTop: 12 }} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 84, height: 84, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  qty: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
});
