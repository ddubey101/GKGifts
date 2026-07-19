import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button, Price, Rating } from "@/src/ui";
import { useCart } from "@/src/cart-store";

const { width: SCREEN_W } = Dimensions.get("window");

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart, toggleWishlist, isWished } = useCart();
  const [p, setP] = useState<any>(null);
  const [gi, setGi] = useState(0);
  const [variant, setVariant] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<any>(`/products/${id}`, { auth: false });
      setP(r);
      if (r.variants?.[0]?.options?.[0]) setVariant(r.variants[0].options[0]);
    } catch {}
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!p) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} />;

  const add = async () => {
    setBusy(true);
    try {
      await addToCart(p.product_id, 1, variant);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast("Added to cart");
      setTimeout(() => setToast(""), 1600);
    } catch (e: any) {
      setToast(e?.message || "Please sign in");
      setTimeout(() => setToast(""), 1800);
    } finally { setBusy(false); }
  };

  const wished = isWished(p.product_id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable testID="pdp-back" onPress={() => router.back()} style={s.topBtn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable testID="pdp-wishlist" onPress={() => toggleWishlist(p.product_id).catch(() => {})} style={s.topBtn}>
            <Ionicons name={wished ? "heart" : "heart-outline"} size={20} color={wished ? colors.brandPrimary : colors.onSurface} />
          </Pressable>
          <Pressable testID="pdp-cart" onPress={() => router.push("/(tabs)/cart")} style={s.topBtn}><Ionicons name="bag-outline" size={20} color={colors.onSurface} /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View>
          <FlatList
            data={p.images || []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setGi(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: SCREEN_W, height: SCREEN_W * 0.9 }} contentFit="cover" />}
          />
          <View style={s.dots}>
            {(p.images || []).map((_: any, i: number) => <View key={i} style={[s.dot, gi === i && s.dotActive]} />)}
          </View>
        </View>

        <View style={{ padding: spacing.lg, gap: 8 }}>
          <Text style={{ fontSize: 12, color: colors.onSurfaceMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>{p.brand}</Text>
          <Text style={{ ...typography.h1, fontSize: 22 }}>{p.name}</Text>
          <Rating value={p.rating || 0} count={p.review_count} />
          <View style={{ marginTop: 8 }}><Price price={p.price} mrp={p.mrp} size={22} /></View>

          {p.variants?.map((v: any) => (
            <View key={v.name} style={{ marginTop: spacing.md }}>
              <Text style={s.varLabel}>{v.name}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {v.options.map((opt: string) => {
                  const active = variant === opt;
                  return (
                    <Pressable key={opt} testID={`variant-${opt}`} onPress={() => { setVariant(opt); Haptics.selectionAsync().catch(() => {}); }} style={[s.varOpt, active && s.varOptActive]}>
                      <Text style={[s.varTxt, active && s.varTxtActive]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={s.section}>Description</Text>
          <Text style={{ color: colors.onSurfaceTertiary, lineHeight: 20 }}>{p.description}</Text>

          <Text style={s.section}>Highlights</Text>
          <View style={{ gap: 6 }}>
            {["Free delivery over ₹499", "7-day easy returns", "1-year warranty", "Genuine product"].map((t) => (
              <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={{ color: colors.onSurfaceTertiary }}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={s.section}>Reviews ({p.reviews?.length || 0})</Text>
          {(p.reviews || []).slice(0, 5).map((r: any) => (
            <View key={r.review_id} style={s.review}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "500" }}>{r.user_name}</Text>
                <Rating value={r.rating} />
              </View>
              {!!r.title && <Text style={{ marginTop: 4, fontWeight: "500" }}>{r.title}</Text>}
              {!!r.body && <Text style={{ marginTop: 2, color: colors.onSurfaceTertiary }}>{r.body}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.onSurfaceMuted, fontSize: 11 }}>Total</Text>
          <Text style={{ fontSize: 18, fontWeight: "500" }}>₹{p.price.toLocaleString("en-IN")}</Text>
        </View>
        <Button testID="add-to-cart" title="Add to Cart" onPress={add} loading={busy} style={{ paddingHorizontal: 32 }} />
      </View>

      {!!toast && (
        <View style={s.toast} pointerEvents="none">
          <Text style={{ color: "#fff" }}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topBar: { position: "absolute", top: 44, left: 0, right: 0, zIndex: 10, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  dots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)" },
  dotActive: { backgroundColor: colors.brandPrimary, width: 18 },
  section: { ...typography.h3, marginTop: spacing.lg },
  varLabel: { fontSize: 12, color: colors.onSurfaceMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  varOpt: { paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  varOptActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  varTxt: { color: colors.onSurface, fontSize: 13 },
  varTxtActive: { color: colors.onBrand, fontWeight: "500" },
  review: { backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.md },
  toast: { position: "absolute", bottom: 100, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.85)", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
});
