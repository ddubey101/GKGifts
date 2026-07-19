import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, spacing, typography } from "@/src/theme";
import { ProductCard } from "@/src/product-card";
import { EmptyState } from "@/src/ui";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = spacing.lg, GAP = spacing.md;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;

export default function Wishlist() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    try { setItems(await api<any[]>("/wishlist")); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={s.header}>
        <Pressable testID="wl-back" onPress={() => router.back()} style={s.btn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={typography.h2}>Wishlist</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => p.product_id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: H_PAD }}
        contentContainerStyle={{ gap: GAP, paddingBottom: spacing.xxxl }}
        renderItem={({ item }) => <View style={{ width: CARD_W }}><ProductCard product={item} width={CARD_W} /></View>}
        ListEmptyComponent={<EmptyState title="Nothing saved yet" subtitle="Tap the ♡ on any product to save it" />}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
