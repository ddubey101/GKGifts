import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button } from "@/src/ui";
import { useCart } from "@/src/cart-store";

const SLOTS = ["Standard (3-5 days)", "Express (1-2 days)", "Weekend delivery"];
const PAYMENTS = [
  { id: "cod", label: "Cash on Delivery", icon: "cash-outline" },
  { id: "mock_card", label: "razorpay.me/@ankitavyas", icon: "card-outline" },
];

export default function Checkout() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addr, setAddr] = useState<string | null>(null);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [payment, setPayment] = useState("cod");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });

  const load = useCallback(async () => {
    const list = await api<any[]>("/addresses");
    setAddresses(list);
    const def = list.find((a) => a.is_default) || list[0];
    if (def) setAddr(def.address_id);
    if (list.length === 0) setShowAddForm(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const applyCoupon = async () => {
    setCouponMsg(""); setDiscount(0);
    if (!coupon.trim()) return;
    try {
      const coupons = await api<any[]>("/coupons", { auth: false });
      const c = coupons.find((x) => x.code === coupon.toUpperCase());
      if (!c) { setCouponMsg("Invalid code"); return; }
      if (cart.subtotal < c.min_order) { setCouponMsg(`Min order ₹${c.min_order}`); return; }
      const d = c.type === "percent"
        ? Math.min(Math.round(cart.subtotal * c.value / 100), c.max_discount || Infinity)
        : c.value;
      setDiscount(d);
      setCouponMsg(`Coupon applied — you save ₹${d}`);
    } catch { setCouponMsg("Invalid code"); }
  };

  const addAddress = async () => {
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.pincode) return;
    await api("/addresses", { method: "POST", body: JSON.stringify({ ...form, is_default: addresses.length === 0 }) });
    setShowAddForm(false);
    setForm({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    load();
  };

  const place = async () => {
    if (!addr) return;
    setBusy(true);
    try {
      const order = await api<any>("/checkout", {
        method: "POST",
        body: JSON.stringify({ address_id: addr, payment_method: payment, coupon_code: coupon || null, delivery_slot: slot }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refreshCart();
      router.replace(`/order/${order.order_id}`);
    } catch (e: any) {
      setCouponMsg(e?.message || "Order failed");
    } finally { setBusy(false); }
  };

  const total = Math.max(0, cart.subtotal + cart.shipping + cart.tax - discount);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable testID="checkout-back" onPress={() => router.back()} style={s.btn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={typography.h2}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 180, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.cardTitle}>Delivery address</Text>
            {addresses.map((a) => (
              <Pressable key={a.address_id} testID={`address-${a.address_id}`} onPress={() => setAddr(a.address_id)} style={[s.addr, addr === a.address_id && s.addrActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "500" }}>{a.label} • {a.full_name}</Text>
                  <Text style={{ color: colors.onSurfaceMuted, marginTop: 2 }}>{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</Text>
                  <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{a.phone}</Text>
                </View>
                {addr === a.address_id && <Ionicons name="checkmark-circle" size={22} color={colors.brandPrimary} />}
              </Pressable>
            ))}
            {!showAddForm ? (
              <Pressable testID="add-address-btn" onPress={() => setShowAddForm(true)} style={s.addBtn}>
                <Ionicons name="add" size={16} color={colors.brandPrimary} />
                <Text style={{ color: colors.brandPrimary, fontWeight: "500" }}>Add address</Text>
              </Pressable>
            ) : (
              <View style={{ gap: 8, marginTop: 8 }}>
                {(["full_name", "phone", "line1", "line2", "city", "state", "pincode"] as const).map((k) => (
                  <TextInput
                    key={k} testID={`addr-${k}`}
                    value={(form as any)[k]}
                    onChangeText={(v) => setForm({ ...form, [k]: v })}
                    style={s.input}
                    placeholder={k === "line1" ? "Address line 1" : k === "line2" ? "Address line 2 (optional)" : k.replace("_", " ")}
                    placeholderTextColor={colors.onSurfaceMuted}
                  />
                ))}
                <Button testID="save-address" title="Save address" onPress={addAddress} />
              </View>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Delivery slot</Text>
            {SLOTS.map((sl) => (
              <Pressable key={sl} testID={`slot-${sl}`} onPress={() => setSlot(sl)} style={[s.opt, slot === sl && s.optActive]}>
                <Ionicons name={slot === sl ? "radio-button-on" : "radio-button-off"} size={20} color={slot === sl ? colors.brandPrimary : colors.onSurfaceMuted} />
                <Text style={{ flex: 1, marginLeft: 10 }}>{sl}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Payment method</Text>
            {PAYMENTS.map((p) => (
              <Pressable key={p.id} testID={`payment-${p.id}`} onPress={() => setPayment(p.id)} style={[s.opt, payment === p.id && s.optActive]}>
                <Ionicons name={p.icon as any} size={20} color={colors.onSurface} />
                <Text style={{ flex: 1, marginLeft: 10 }}>{p.label}</Text>
                <Ionicons name={payment === p.id ? "checkmark-circle" : "ellipse-outline"} size={20} color={payment === p.id ? colors.brandPrimary : colors.onSurfaceMuted} />
              </Pressable>
            ))}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Coupon</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput testID="coupon-input" value={coupon} onChangeText={setCoupon} autoCapitalize="characters" placeholder="Enter code" placeholderTextColor={colors.onSurfaceMuted} style={[s.input, { flex: 1 }]} />
              <Button testID="apply-coupon" title="Apply" onPress={applyCoupon} variant="secondary" style={{ paddingHorizontal: 16 }} />
            </View>
            {!!couponMsg && <Text style={{ color: discount > 0 ? colors.success : colors.error, marginTop: 6 }}>{couponMsg}</Text>}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Summary</Text>
            <SummaryRow label="Subtotal" value={`₹${cart.subtotal.toLocaleString("en-IN")}`} />
            <SummaryRow label="Shipping" value={cart.shipping === 0 ? "Free" : `₹${cart.shipping}`} />
            <SummaryRow label="Tax" value={`₹${cart.tax}`} />
            {discount > 0 && <SummaryRow label="Discount" value={`- ₹${discount}`} color={colors.success} />}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
            <SummaryRow label="Total" value={`₹${total.toLocaleString("en-IN")}`} bold />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <Button testID="place-order" title={`Place order · ₹${total.toLocaleString("en-IN")}`} onPress={place} loading={busy} disabled={!addr || cart.items.length === 0} />
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: colors.onSurfaceMuted, fontWeight: bold ? "500" : "400" }}>{label}</Text>
      <Text style={{ color: color || colors.onSurface, fontWeight: bold ? "500" : "400", fontSize: bold ? 16 : 14 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardTitle: { ...typography.h3, marginBottom: 4 },
  addr: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  addrActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandSecondary },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, alignSelf: "flex-start" },
  opt: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  optActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandSecondary },
  input: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.onSurface },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
});
