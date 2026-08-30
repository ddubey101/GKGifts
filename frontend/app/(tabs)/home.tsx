import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList, Image as RNImage, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, radius, spacing, typography } from "@/src/theme";
import { ProductCard } from "@/src/product-card";
import { useResponsiveCols } from "@/src/use-responsive-cols";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { width, cols, railCard, hPad, contentMax, bannerWidth } = useResponsiveCols();
  const gridGap = spacing.md;
  const contentW = Math.min(width, contentMax);
  const cardW = (contentW - hPad * 2 - gridGap * (cols - 1)) / cols;

  const [banners, setBanners] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [flash, setFlash] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [newIn, setNewIn] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, c, f, feat, ne] = await Promise.all([
        api<any[]>("/banners", { auth: false }),
        api<any[]>("/categories", { auth: false }),
        api<any[]>("/products?tag=flash_sale&limit=8", { auth: false }),
        api<any[]>("/products?tag=featured&limit=10", { auth: false }),
        api<any[]>("/products?tag=new&limit=10", { auth: false }),
      ]);
      setBanners(b); setCats(c); setFlash(f); setFeatured(feat); setNewIn(ne);
    } catch (e) { console.log("home load", e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={[s.centerRow, { paddingHorizontal: hPad, backgroundColor: colors.surface }]}>
        <View style={[s.headerInner, { maxWidth: contentMax }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <RNImage
              source={require("../../assets/images/gk-logo.png")}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
            <View>
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>Hello,</Text>
              <Text style={{ ...typography.h3, color: colors.onSurface }}>{user?.name || "Shopper"}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable testID="header-notifications" onPress={() => router.push("/notifications")} style={s.headerBtn}>
              <Ionicons name="notifications-outline" size={20} color={colors.onSurface} />
            </Pressable>
            <Pressable testID="header-wishlist" onPress={() => router.push("/wishlist")} style={s.headerBtn}>
              <Ionicons name="heart-outline" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl, alignItems: "center" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
      >
        <View style={{ width: "100%", maxWidth: contentMax }}>
          <Pressable
            testID="home-search-bar"
            onPress={() => router.push("/(tabs)/search")}
            style={[s.searchBar, { marginHorizontal: hPad }]}
          >
            <Ionicons name="search" size={18} color={colors.onSurfaceMuted} />
            <Text style={{ color: colors.onSurfaceMuted }}>Search for products, brands…</Text>
          </Pressable>

          <FlatList
            data={banners}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(b) => b.banner_id}
            contentContainerStyle={{ paddingHorizontal: hPad, gap: spacing.md }}
            renderItem={({ item }) => (
              <Pressable
                testID={`banner-${item.banner_id}`}
                onPress={() => router.push(`/category/${item.link}`)}
                style={[s.banner, { width: bannerWidth }]}
              >
                <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.75)"]} style={s.bannerScrim} />
                <View style={s.bannerText}>
                  <Text style={{ color: "#fff", fontSize: 12, opacity: 0.9 }}>{item.subtitle}</Text>
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "500" }}>{item.title}</Text>
                  <View style={s.bannerCta}><Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>{item.cta} →</Text></View>
                </View>
              </Pressable>
            )}
          />

          <SectionHeader title="Shop by category" hPad={hPad} />
          <FlatList
            data={cats}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c.category_id}
            contentContainerStyle={{ paddingHorizontal: hPad, gap: spacing.md }}
            renderItem={({ item }) => (
              <Pressable testID={`category-${item.category_id}`} onPress={() => router.push(`/category/${item.category_id}`)} style={s.catCard}>
                <Image source={{ uri: item.image }} style={s.catImg} contentFit="cover" />
                <Text style={s.catName} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            )}
          />

          {flash.length > 0 && (
            <>
              <SectionHeader title="⚡ Flash Sale" subtitle="Ends tonight" hPad={hPad} />
              <FlatList
                data={flash}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(p) => p.product_id}
                contentContainerStyle={{ paddingHorizontal: hPad, gap: spacing.md }}
                renderItem={({ item }) => (
                  <View style={{ width: railCard }}>
                    <ProductCard product={item} width={railCard} />
                  </View>
                )}
              />
            </>
          )}

          <SectionHeader title="Featured for you" hPad={hPad} />
          <View style={[s.grid, { paddingHorizontal: hPad, gap: gridGap }]}>
            {featured.map((p) => (
              <View key={p.product_id} style={{ width: cardW }}>
                <ProductCard product={p} width={cardW} />
              </View>
            ))}
          </View>

          {newIn.length > 0 && (
            <>
              <SectionHeader title="New arrivals" hPad={hPad} />
              <FlatList
                data={newIn}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(p) => p.product_id}
                contentContainerStyle={{ paddingHorizontal: hPad, gap: spacing.md }}
                renderItem={({ item }) => <ProductCard product={item} width={railCard} />}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, subtitle, hPad }: { title: string; subtitle?: string; hPad: number }) {
  return (
    <View style={{ paddingHorizontal: hPad, marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
      <Text style={{ ...typography.h2, color: colors.onSurface }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.brandPrimary, fontSize: 12 }}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  centerRow: { alignItems: "center" },
  headerInner: {
    width: "100%", flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: spacing.md,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  searchBar: { marginBottom: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border },
  banner: { height: 160, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceTertiary },
  bannerScrim: { position: "absolute", left: 0, right: 0, bottom: 0, top: 0 },
  bannerText: { position: "absolute", left: spacing.lg, bottom: spacing.lg, gap: 4 },
  bannerCta: { marginTop: 8, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, alignSelf: "flex-start" },
  catCard: { width: 80, alignItems: "center", gap: 8 },
  catImg: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.surfaceTertiary },
  catName: { fontSize: 12, color: colors.onSurface, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
});
