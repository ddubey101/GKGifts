import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, spacing, typography } from "@/src/theme";
import { ProductCard } from "@/src/product-card";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = spacing.lg, GAP = spacing.md;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("Category");

  const load = useCallback(async () => {
    const [prods, cats] = await Promise.all([
      api<any[]>(`/products?category_id=${id}&limit=60`, { auth: false }),
      api<any[]>("/categories", { auth: false }),
    ]);
    setItems(prods);
    setName(cats.find((c) => c.category_id === id)?.name || "Category");
  }, [id]);
  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={s.header}>
        <Pressable testID="cat-back" onPress={() => router.back()} style={s.btn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={typography.h2}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => p.product_id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: H_PAD }}
        contentContainerStyle={{ gap: GAP, paddingBottom: spacing.xxxl }}
        renderItem={({ item }) => <View style={{ width: CARD_W }}><ProductCard product={item} width={CARD_W} /></View>}
        ListEmptyComponent={<Text style={{ color: colors.onSurfaceMuted, textAlign: "center", padding: spacing.xxl }}>No products</Text>}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
