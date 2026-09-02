import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import { AppHeader } from "@/src/app-header";

export default function Offers() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => setItems(await api<any[]>("/coupons", { auth: false })))();
  }, []);

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <AppHeader title="Offers & Coupons" showNotifications={false} showWishlist={false} hPad={spacing.lg} />
      <FlatList
        data={items}
        keyExtractor={(c) => c.code}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
        renderItem={({ item }) => (
          <View style={s.coupon} testID={`coupon-${item.code}`}>
            <LinearGradient colors={[colors.brandPrimary, colors.brand]} style={s.couponLeft}>
              <Ionicons name="pricetag" size={26} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, padding: spacing.md }}>
              <Text style={{ fontWeight: "500", fontSize: 15 }}>{item.title}</Text>
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
                <View style={s.codeBox}><Text style={{ fontFamily: "Courier", fontWeight: "500", color: colors.onBrandSecondary }}>{item.code}</Text></View>
                <Pressable testID={`copy-${item.code}`} onPress={() => copy(item.code)} style={s.copyBtn}>
                  <Text style={{ color: colors.brandPrimary, fontWeight: "500", fontSize: 12 }}>{copied === item.code ? "COPIED" : "COPY"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  coupon: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
