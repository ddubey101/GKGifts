import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";
import { ProductCard } from "@/src/product-card";
import { useResponsiveCols } from "@/src/use-responsive-cols";

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "new", label: "Newest" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "rating", label: "Rating" },
];

export default function Search() {
  const { width, cols, hPad, contentMax } = useResponsiveCols();
  const gridGap = spacing.md;
  const contentW = Math.min(width, contentMax);
  const cardW = (contentW - hPad * 2 - gridGap * (cols - 1)) / cols;

  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<string[]>([]);
  const [sort, setSort] = useState("popular");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSug, setShowSug] = useState(true);

  const run = useCallback(async (query: string, sortId: string) => {
    setLoading(true);
    try {
      const r = await api<any[]>(`/products?sort=${sortId}${query ? `&q=${encodeURIComponent(query)}` : ""}&limit=60`, { auth: false });
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
      <View style={{ alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: contentMax, paddingHorizontal: hPad, paddingVertical: spacing.md }}>
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
      </View>

      <View style={{ alignItems: "center" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 56, width: "100%", maxWidth: contentMax }}
          contentContainerStyle={{ paddingHorizontal: hPad, gap: 8, alignItems: "center", height: 56 }}
        >
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
      </View>

      {q.length > 0 && showSug && suggest.length > 0 && (
        <View style={{ alignItems: "center" }}>
          <View style={[s.sugBox, { width: "100%", maxWidth: contentMax, marginHorizontal: hPad }]}>
            {suggest.map((sug, i) => (
              <Pressable key={i} testID={`suggest-${i}`} onPress={() => { setQ(sug); setShowSug(false); Keyboard.dismiss(); run(sug, sort); }} style={s.sugRow}>
                <Ionicons name="search" size={14} color={colors.onSurfaceMuted} />
                <Text style={{ color: colors.onSurface }}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <FlatList
        key={`grid-${cols}`}
        data={items}
        keyExtractor={(p) => p.product_id}
        numColumns={cols}
        columnWrapperStyle={{ gap: gridGap, paddingHorizontal: hPad }}
        contentContainerStyle={{ gap: gridGap, paddingTop: spacing.md, paddingBottom: spacing.xxxl, alignSelf: "center", maxWidth: contentMax, width: "100%" }}
        renderItem={({ item }) => <View style={{ width: cardW }}><ProductCard product={item} width={cardW} /></View>}
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
  searchBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13 },
  chipTextActive: { color: colors.onBrand, fontWeight: "500" },
  sugBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  sugRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
});
