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
import { trackVisitor } from "@/src/visitor";

const LOGO_RAINBOW = ["#08CBE5", "#0078E8", "#6812E4", "#ED087D", "#F52B08", "#FFCE05"] as const;
const LOGO_RAINBOW_FADE = ["rgba(8,203,229,0.5)", "rgba(0,120,232,0.5)", "rgba(104,18,228,0.5)", "rgba(237,8,125,0.5)", "rgba(245,43,8,0.5)", "rgba(255,206,5,0.5)"] as const;

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
        api<any[]>("/products?tag=flash_sale&limit=80", { auth: false }),
        api<any[]>("/products?tag=featured&limit=100", { auth: false }),
        api<any[]>("/products?tag=new&limit=100", { auth: false }),
      ]);
      setBanners(b); setCats(c); setFlash(f); setFeatured(feat); setNewIn(ne);
    } catch (e) { console.log("home load", e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    trackVisitor().catch((error) => console.log("visitor tracking", error));
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={[s.centerRow, { paddingHorizontal: hPad, backgroundColor: colors.surface }]}>
        <View style={[s.headerInner, { maxWidth: contentMax }]}>
          <Pressable testID="home-logo" onPress={() => router.push("/(tabs)/home")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <RNImage
              source={require("../../assets/images/gk-logo.png")}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
            <View>
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>Hello,</Text>
              <Text style={{ ...typography.h3, color: colors.onSurface }}>{user?.name || "Shopper"}</Text>
            </View>
          </Pressable>
          {user ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable testID="header-notifications" onPress={() => router.push("/notifications")} style={s.headerBtn}>
                <Ionicons name="notifications-outline" size={20} color={colors.onSurface} />
              </Pressable>
              <Pressable testID="header-wishlist" onPress={() => router.push("/wishlist")} style={s.headerBtn}>
                <Ionicons name="heart-outline" size={20} color={colors.onSurface} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              testID="header-sign-in"
              onPress={() => router.push("/(auth)/login")}
              style={s.signInBtn}
            >
              <Ionicons name="person-outline" size={16} color={colors.brandPrimary} />
              <Text style={s.signInText}>Sign in</Text>
            </Pressable>
          )}
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

          <LinearGradient
            colors={LOGO_RAINBOW_FADE}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={s.categorySection}
          >
            <SectionHeader title="Shop by category" hPad={hPad} />
            <FlatList
              data={cats}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => c.category_id}
              contentContainerStyle={{ paddingHorizontal: hPad, gap: spacing.md, paddingBottom: spacing.lg }}
              renderItem={({ item }) => {
                return (
                  <Pressable testID={`category-${item.category_id}`} onPress={() => router.push(`/category/${item.category_id}`)} style={s.catCard}>
                    <LinearGradient colors={LOGO_RAINBOW} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={s.catRing}>
                      <Image source={{ uri: item.image }} style={s.catImg} contentFit="cover" />
                    </LinearGradient>
                    <Text style={s.catName} numberOfLines={2}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
          </LinearGradient>

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
  signInBtn: { height: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.brandPrimary },
  signInText: { color: colors.brandPrimary, fontWeight: "500" },
  searchBar: { marginBottom: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  banner: { height: 160, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceTertiary },
  bannerScrim: { position: "absolute", left: 0, right: 0, bottom: 0, top: 0 },
  bannerText: { position: "absolute", left: spacing.lg, bottom: spacing.lg, gap: 4 },
  bannerCta: { marginTop: 8, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, alignSelf: "flex-start" },
  categorySection: { marginTop: spacing.xl },
  catCard: { width: 80, alignItems: "center", gap: 8 },
  catRing: { width: 72, height: 72, borderRadius: 36, padding: 3, alignItems: "center", justifyContent: "center" },
  catImg: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.surfaceTertiary },
  catName: { fontSize: 12, color: colors.onSurface, fontWeight: "500", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
});
