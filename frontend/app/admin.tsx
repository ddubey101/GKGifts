import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { EmptyState } from "@/src/ui";

const STATUSES = ["confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];

export default function Admin() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "orders">("overview");

  const load = useCallback(async () => {
    try {
      const [st, ord] = await Promise.all([
        api<any>("/admin/stats"),
        api<any[]>("/admin/orders"),
      ]);
      setStats(st); setOrders(ord);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  if (user?.role !== "admin") {
    return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Admin only" subtitle="Sign in with admin@aura.com" /></SafeAreaView>;
  }

  const advance = async (orderId: string, currentStatus: string) => {
    const idx = STATUSES.indexOf(currentStatus);
    const next = STATUSES[idx + 1] || "delivered";
    if (currentStatus === "delivered" || currentStatus === "cancelled") return;
    await api(`/admin/orders/${orderId}/status`, { method: "POST", body: JSON.stringify({ status: next }) });
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={s.header}>
        <Pressable testID="admin-back" onPress={() => router.back()} style={s.btn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={typography.h2}>Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabs}>
        {(["overview", "orders"] as const).map((t) => (
          <Pressable key={t} testID={`admin-tab-${t}`} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "overview" && stats && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}>
          <View style={s.kpiGrid}>
            <Kpi label="Revenue" value={`₹${stats.revenue.toLocaleString("en-IN")}`} color={colors.brandPrimary} />
            <Kpi label="Orders" value={String(stats.orders)} color={colors.success} />
            <Kpi label="Customers" value={String(stats.users)} color={colors.warning} />
            <Kpi label="Products" value={String(stats.products)} color={colors.onSurface} />
          </View>
          <View style={s.card}>
            <Text style={typography.h3}>Low stock</Text>
            <Text style={{ color: stats.low_stock > 0 ? colors.error : colors.onSurfaceMuted, marginTop: 6 }}>
              {stats.low_stock > 0 ? `${stats.low_stock} product(s) below 10 units` : "All good — inventory is healthy"}
            </Text>
          </View>
          <View style={s.card}>
            <Text style={typography.h3}>Top products</Text>
            {stats.top_products?.map((p: any) => (
              <View key={p.product_id} style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <Image source={{ uri: p.images?.[0] }} style={s.thumb} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1}>{p.name}</Text>
                  <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{p.review_count} reviews · ★ {p.rating}</Text>
                </View>
                <Text style={{ fontWeight: "500" }}>₹{p.price}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {tab === "orders" && (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.order_id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
          renderItem={({ item }) => (
            <View style={s.card} testID={`admin-order-${item.order_id}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "500" }}>#{item.order_id.slice(-6).toUpperCase()}</Text>
                <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={{ color: colors.onSurfaceMuted, marginTop: 4, fontSize: 12 }}>{item.items.length} items · ₹{item.total}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
                <View style={[s.badge, { backgroundColor: item.status === "delivered" ? colors.success : item.status === "cancelled" ? colors.error : colors.brandPrimary }]}>
                  <Text style={{ color: "#fff", fontSize: 11, textTransform: "capitalize", fontWeight: "500" }}>{item.status.replace(/_/g, " ")}</Text>
                </View>
                {item.status !== "delivered" && item.status !== "cancelled" && (
                  <Pressable testID={`advance-${item.order_id}`} onPress={() => advance(item.order_id, item.status)} style={s.advance}>
                    <Text style={{ color: colors.brandPrimary, fontWeight: "500", fontSize: 12 }}>Advance →</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderLeftColor: color }]}>
      <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ ...typography.h2, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  tabTxt: { color: colors.onSurface, fontSize: 13 },
  tabTxtActive: { color: colors.onBrand, fontWeight: "500" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  kpi: { flexBasis: "48%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 4, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  advance: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.brandSecondary },
});
