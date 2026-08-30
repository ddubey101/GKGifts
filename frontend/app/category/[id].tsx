import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, spacing, typography } from "@/src/theme";
import { ProductCard } from "@/src/product-card";
import { useResponsiveCols } from "@/src/use-responsive-cols";

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width, cols, hPad, contentMax } = useResponsiveCols();
  const gridGap = spacing.md;
  const contentW = Math.min(width, contentMax);
  const cardW = (contentW - hPad * 2 - gridGap * (cols - 1)) / cols;

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
      <View style={{ alignItems: "center" }}>
        <View style={[s.header, { width: "100%", maxWidth: contentMax, paddingHorizontal: hPad }]}>
          <Pressable testID="cat-back" onPress={() => router.back()} style={s.btn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
          <Text style={typography.h2}>{name}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
      <FlatList
        key={`grid-${cols}`}
        data={items}
        keyExtractor={(p) => p.product_id}
        numColumns={cols}
        columnWrapperStyle={{ gap: gridGap, paddingHorizontal: hPad }}
        contentContainerStyle={{ gap: gridGap, paddingBottom: spacing.xxxl, alignSelf: "center", maxWidth: contentMax, width: "100%" }}
        renderItem={({ item }) => <View style={{ width: cardW }}><ProductCard product={item} width={cardW} /></View>}
        ListEmptyComponent={<Text style={{ color: colors.onSurfaceMuted, textAlign: "center", padding: spacing.xxl }}>No products</Text>}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm, marginBottom: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
