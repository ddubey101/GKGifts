import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions, FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { ProductCard } from "@/src/product-card";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = spacing.lg, GAP = spacing.md;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;
const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "new", label: "Newest" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "rating", label: "Rating" },
];

export default function Search() {
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<string[]>([]);
  const [sort, setSort] = useState("popular");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSug, setShowSug] = useState(true);

  const run = useCallback(async (query: string, sortId: string) => {
    setLoading(true);
    try {
      const r = await api<any[]>(`/products?sort=${sortId}${query ? `&q=${encodeURIComponent(query)}` : ""}&limit=40`, { auth: false });
      setItems(r);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { run("", sort); }, [run, sort]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try { const r = await api<string[]>(`/search/suggest?q=${encodeURIComponent(q)}`, { auth: false }); setSuggest(r); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const submit = () => { setShowSug(false); Keyboard.dismiss(); run(q, sort); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={s.header}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.onSurfaceMuted} />
          <TextInput
            testID="search-input"
            value={q}
            onChangeText={(v) => { setQ(v); setShowSug(true); }}
            onSubmitEditing={submit}
            placeholder="Search products, brands…"
            placeholderTextColor={colors.onSurfaceMuted}
            style={{ flex: 1, fontSize: 15, color: colors.onSurface }}
            returnKeyType="search"
          />
          {!!q && <Pressable testID="clear-search" onPress={() => { setQ(""); run("", sort); }}><Ionicons name="close-circle" size={18} color={colors.onSurfaceMuted} /></Pressable>}
        </View>
      </View>

      {/* Sort chips row (chrome) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56 }} contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 8, alignItems: "center", height: 56 }}>
        {SORTS.map((sortItem) => {
          const active = sort === sortItem.id;
          return (
            <Pressable
              key={sortItem.id}
              testID={`sort-${sortItem.id}`}
              onPress={() => setSort(sortItem.id)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{sortItem.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {q.length > 0 && showSug && suggest.length > 0 && (
        <View style={s.sugBox}>
          {suggest.map((sug, i) => (
            <Pressable key={i} testID={`suggest-${i}`} onPress={() => { setQ(sug); setShowSug(false); Keyboard.dismiss(); run(sug, sort); }} style={s.sugRow}>
              <Ionicons name="search" size={14} color={colors.onSurfaceMuted} />
              <Text style={{ color: colors.onSurface }}>{sug}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(p) => p.product_id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: H_PAD }}
        contentContainerStyle={{ gap: GAP, paddingTop: spacing.md, paddingBottom: spacing.xxxl }}
        renderItem={({ item }) => <View style={{ width: CARD_W }}><ProductCard product={item} width={CARD_W} /></View>}
        ListEmptyComponent={
          <View style={{ padding: spacing.xxl, alignItems: "center" }}>
            <Text style={{ color: colors.onSurfaceMuted }}>{loading ? "Loading…" : "No results"}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: H_PAD, paddingVertical: spacing.md },
  searchBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13 },
  chipTextActive: { color: colors.onBrand, fontWeight: "500" },
  sugBox: { backgroundColor: colors.surfaceSecondary, marginHorizontal: H_PAD, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  sugRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
});
