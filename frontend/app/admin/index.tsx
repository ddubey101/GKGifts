import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { EmptyState } from "@/src/ui";
import { AppHeader } from "@/src/app-header";
import React, { useCallback, useEffect, useState } from "react";

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
    return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Admin only" subtitle="Sign in with admin@gkgifts.com" /></SafeAreaView>;
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
      <AppHeader title="Admin" showNotifications={false} showWishlist={false} hPad={spacing.lg} />

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

          <Pressable
            testID="admin-manage-products"
            onPress={() => router.push("/admin/products")}
            style={[s.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
          >
