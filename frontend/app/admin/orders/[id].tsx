import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button, EmptyState } from "@/src/ui";

const STATUSES = ["confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  mock_card: "UPI / Card / Netbanking / Wallet",
};

export default function AdminOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setOrder(await api<any>(`/admin/orders/${id}`));
    } catch (e: any) {
      setError(e?.message || "Could not load this order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    if (!order || order.status === "delivered" || order.status === "cancelled") return;
    const currentIndex = STATUSES.indexOf(order.status);
    const nextStatus = STATUSES[currentIndex + 1] || "delivered";
    setUpdating(true);
    try {
      await api(`/admin/orders/${order.order_id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={colors.brandPrimary} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.center}>
        <EmptyState title="Order unavailable" subtitle={error || "This order could not be found"} cta="Go back" onCta={() => router.back()} />
      </SafeAreaView>
    );
  }

  const address = order.address || {};
  const paymentLabel = PAYMENT_LABELS[order.payment_method] || order.payment_method || "Not recorded";
  const canAdvance = order.status !== "delivered" && order.status !== "cancelled";
  const currentIndex = STATUSES.indexOf(order.status);
  const nextStatus = STATUSES[currentIndex + 1] || "delivered";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable testID="admin-order-back" onPress={() => router.back()} style={s.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={typography.h2}>Order details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <View style={s.between}>
            <View>
              <Text style={s.eyebrow}>ORDER</Text>
              <Text style={{ ...typography.h3, marginTop: 2 }}>#{order.order_id.slice(-6).toUpperCase()}</Text>
            </View>
            <View style={s.statusBadge}>
              <Text style={s.statusText}>{String(order.status).replace(/_/g, " ")}</Text>
            </View>
          </View>
          <Text style={s.muted}>Placed on {new Date(order.created_at).toLocaleString()}</Text>
          {!!order.delivery_slot && <Text style={s.muted}>Delivery: {order.delivery_slot}</Text>}
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Products</Text>
          {order.items.map((item: any, index: number) => (
            <Pressable
              key={`${item.product_id}-${index}`}
              testID={`admin-order-product-${item.product_id}`}
              onPress={() => router.push(`/product/${item.product_id}`)}
              style={s.productRow}
            >
              <Image source={{ uri: item.image }} style={s.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ fontWeight: "500" }}>{item.name}</Text>
                {!!item.variant && <Text style={s.mutedSmall}>{item.variant}</Text>}
                <Text style={s.mutedSmall}>Quantity: {item.quantity}</Text>
                <Text style={s.mutedSmall}>Unit price: ₹{Number(item.price).toLocaleString("en-IN")}</Text>
                <View style={s.productLink}>
                  <Text style={s.productLinkText}>View product</Text>
                  <Ionicons name="open-outline" size={14} color={colors.brandPrimary} />
                </View>
              </View>
              <Text style={s.lineTotal}>₹{(Number(item.price) * Number(item.quantity)).toLocaleString("en-IN")}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Customer</Text>
          <InfoRow icon="person-outline" value={address.full_name || "Not recorded"} />
          <InfoRow icon="call-outline" value={address.phone || "Not recorded"} />
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Delivery address</Text>
          <View style={s.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.onSurfaceMuted} />
            <Text style={{ flex: 1, color: colors.onSurface }}>
              {[address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ") || "Not recorded"}
            </Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={typography.h3}>Bill summary</Text>
          <BillRow label="Subtotal" value={`₹${Number(order.subtotal || 0).toLocaleString("en-IN")}`} />
          <BillRow label="Shipping" value={Number(order.shipping || 0) === 0 ? "Free" : `₹${Number(order.shipping).toLocaleString("en-IN")}`} />
          {order.tax != null && Number(order.tax) > 0 && <BillRow label="Tax" value={`₹${Number(order.tax).toLocaleString("en-IN")}`} />}
          {Number(order.discount || 0) > 0 && <BillRow label="Discount" value={`- ₹${Number(order.discount).toLocaleString("en-IN")}`} accent />}
          <View style={s.divider} />
          <BillRow label="Total bill amount" value={`₹${Number(order.total || 0).toLocaleString("en-IN")}`} bold />
          <View style={s.paymentRow}>
            <Ionicons name={order.payment_method === "cod" ? "cash-outline" : "card-outline"} size={18} color={colors.onSurfaceMuted} />
            <View style={{ flex: 1 }}>
              <Text style={s.mutedSmall}>Payment option</Text>
              <Text>{paymentLabel}</Text>
            </View>
          </View>
        </View>

        {canAdvance && (
          <Button
            testID="admin-order-advance"
            title={`Advance to ${nextStatus.replace(/_/g, " ")}`}
            onPress={advance}
            loading={updating}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={18} color={colors.onSurfaceMuted} />
      <Text style={{ flex: 1 }}>{value}</Text>
    </View>
  );
}

function BillRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <View style={s.between}>
      <Text style={{ color: bold ? colors.onSurface : colors.onSurfaceMuted, fontWeight: bold ? "500" : "400" }}>{label}</Text>
      <Text style={{ color: accent ? colors.success : colors.onSurface, fontWeight: bold ? "500" : "400", fontSize: bold ? 16 : 14 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  eyebrow: { fontSize: 11, color: colors.onSurfaceMuted },
  muted: { color: colors.onSurfaceMuted, fontSize: 12 },
  mutedSmall: { color: colors.onSurfaceMuted, fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandSecondary },
  statusText: { color: colors.onBrandSecondary, fontSize: 11, textTransform: "capitalize", fontWeight: "500" },
  productRow: { flexDirection: "row", gap: 10, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "flex-start" },
  thumb: { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  productLink: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5, alignSelf: "flex-start" },
  productLinkText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "500" },
  lineTotal: { fontWeight: "500", fontSize: 14 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});