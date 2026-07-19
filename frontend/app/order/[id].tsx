import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button } from "@/src/ui";

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
      <View style={s.header}>
        <Pressable testID="order-back" onPress={() => router.back()} style={s.btn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={typography.h2}>Order details</Text>
        <View style={{ width: 40 }} />
      </View>
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
                      {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={{ color: done ? colors.onSurface : colors.onSurfaceMuted, fontWeight: done ? "500" : "400" }}>{st.label}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Items</Text>
          {o.items.map((it: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Image source={{ uri: it.image }} style={s.thumb} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2}>{it.name}</Text>
                {!!it.variant && <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{it.variant}</Text>}
                <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>Qty {it.quantity} · ₹{it.price}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Delivery address</Text>
          <Text style={{ marginTop: 6 }}>{o.address.full_name}</Text>
          <Text style={{ color: colors.onSurfaceMuted }}>{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}, {o.address.city}, {o.address.state} {o.address.pincode}</Text>
          <Text style={{ color: colors.onSurfaceMuted }}>{o.address.phone}</Text>
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Payment</Text>
          <View style={{ marginTop: 6 }}>
            <Row label="Subtotal" v={`₹${o.subtotal}`} />
            <Row label="Shipping" v={o.shipping === 0 ? "Free" : `₹${o.shipping}`} />
            <Row label="Tax" v={`₹${o.tax}`} />
            {o.discount > 0 && <Row label={`Discount (${o.coupon_code || "coupon"})`} v={`- ₹${o.discount}`} c={colors.success} />}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
            <Row label="Total paid" v={`₹${o.total}`} bold />
            <Text style={{ marginTop: 6, color: colors.onSurfaceMuted, fontSize: 12 }}>{o.payment_method === "cod" ? "Cash on Delivery" : "Card (mock)"}</Text>
          </View>
        </View>

        {o.status !== "delivered" && o.status !== "cancelled" && (
          <Button testID="cancel-order" title="Cancel order" variant="ghost" onPress={cancel} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Row({ label, v, bold, c }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: colors.onSurfaceMuted, fontWeight: bold ? "500" : "400" }}>{label}</Text>
      <Text style={{ color: c || colors.onSurface, fontWeight: bold ? "500" : "400", fontSize: bold ? 16 : 14 }}>{v}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  stageDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
