import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button } from "@/src/ui";
import { AppHeader } from "@/src/app-header";
import React, { useCallback, useEffect, useState } from "react";

const STAGES = [
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [o, setO] = useState<any>(null);

  const load = useCallback(async () => {
    try { setO(await api<any>(`/orders/${id}`)); } catch {}
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    await api(`/orders/${id}/cancel`, { method: "POST" });
    load();
  };

  if (!o) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} />;

  const currentIdx = o.status === "cancelled" ? -1 : STAGES.findIndex((s) => s.key === o.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <AppHeader title="Order details" showNotifications={false} showWishlist={false} hPad={spacing.lg} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        <View style={s.card}>
          <Text style={{ fontSize: 12, color: colors.onSurfaceMuted }}>ORDER</Text>
          <Text style={{ ...typography.h3, marginTop: 2 }}>#{o.order_id.slice(-6).toUpperCase()}</Text>
          <Text style={{ color: colors.onSurfaceMuted, marginTop: 4 }}>Placed on {new Date(o.created_at).toLocaleString()}</Text>
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Tracking</Text>
          <View style={{ marginTop: spacing.md }}>
            {o.status === "cancelled" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[s.stageDot, { backgroundColor: colors.error }]} />
                <Text style={{ color: colors.error, fontWeight: "500" }}>Order cancelled</Text>
              </View>
            ) : (
              STAGES.map((st, i) => {
                const done = i <= currentIdx;
                return (
                  <View key={st.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <View style={[s.stageDot, { backgroundColor: done ? colors.brandPrimary : colors.border }]}>
