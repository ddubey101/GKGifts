import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, radius, spacing, typography } from "@/src/theme";
import { EmptyState } from "@/src/ui";

const STATUS_COLOR: Record<string, string> = {
  confirmed: colors.brandPrimary,
  packed: colors.warning,
  shipped: colors.warning,
  out_for_delivery: colors.brandPrimary,
  delivered: colors.success,
  cancelled: colors.error,
};

export default function Orders() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try { setOrders(await api<any[]>("/orders")); } catch {}
  }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Sign in" cta="Login" onCta={() => router.push("/(auth)/login")} /></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Text style={typography.h2}>My Orders</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.order_id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandPrimary} />}
        ListEmptyComponent={<View style={{ padding: spacing.xxl }}><EmptyState title="No orders yet" subtitle="Your future orders will appear here" cta="Start shopping" onCta={() => router.push("/(tabs)/home")} /></View>}
        renderItem={({ item }) => (
          <Pressable testID={`order-${item.order_id}`} onPress={() => router.push(`/order/${item.order_id}`)} style={s.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: colors.onSurfaceMuted }}>Order #{item.order_id.slice(-6).toUpperCase()}</Text>
              <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] || colors.onSurfaceMuted }]}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "500", textTransform: "capitalize" }}>{item.status.replace(/_/g, " ")}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {item.items.slice(0, 4).map((it: any, i: number) => (
                <Image key={i} source={{ uri: it.image }} style={s.thumb} contentFit="cover" />
              ))}
              {item.items.length > 4 && (
                <View style={[s.thumb, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary }]}>
                  <Text style={{ fontSize: 12, color: colors.onSurface }}>+{item.items.length - 4}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()} • {item.items.length} item(s)</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontWeight: "500" }}>₹{item.total.toLocaleString("en-IN")}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceMuted} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
});
