import React from "react";
import { Pressable, Image as RNImage, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

interface HeaderProps {
  title?: string;
  userName?: string | null;
  showNotifications?: boolean;
  showWishlist?: boolean;
  showSearch?: boolean;
  onSearchPress?: () => void;
  hPad?: number;
  contentMax?: number;
}

export function AppHeader({
  title,
  userName,
  showNotifications = true,
  showWishlist = true,
  showSearch = false,
  onSearchPress,
  hPad = 0,
  contentMax = 1000,
}: HeaderProps) {
  const router = useRouter();

  const left = title ? (
    <Pressable testID="back" onPress={() => router.back()} style={s.iconBtn}>
      <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
    </Pressable>
  ) : (
    <Pressable testID="home-logo" onPress={() => router.push("/(tabs)/home")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <RNImage source={require("../assets/images/gk-logo.png")} style={{ width: 36, height: 36 }} resizeMode="contain" />
      {!!userName && (
        <View>
          <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>Hello,</Text>
          <Text style={{ ...typography.h3, color: colors.onSurface }}>{userName}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={[s.centerRow, { paddingHorizontal: hPad, backgroundColor: colors.surface }]}>
      <View style={[s.headerInner, { maxWidth: contentMax }]}>
        {left}
        {title ? <Text style={typography.h2}>{title}</Text> : <View style={{ width: 1 }} />}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {showNotifications && (
            <Pressable testID="header-notifications" onPress={() => router.push("/notifications")} style={s.headerBtn}>
              <Ionicons name="notifications-outline" size={20} color={colors.onSurface} />
            </Pressable>
          )}
          {showWishlist && (
            <Pressable testID="header-wishlist" onPress={() => router.push("/wishlist")} style={s.headerBtn}>
              <Ionicons name="heart-outline" size={20} color={colors.onSurface} />
            </Pressable>
          )}
        </View>
      </View>

      {showSearch && (
        <Pressable
          testID="global-search-bar"
          onPress={() => (onSearchPress ? onSearchPress() : router.push("/(tabs)/search"))}
          style={[s.searchBar, { marginHorizontal: hPad }]}
        >
          <Ionicons name="search" size={18} color={colors.onSurfaceMuted} />
          <Text style={{ color: colors.onSurfaceMuted }}>Search for products, brands…</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  centerRow: { alignItems: "center" },
  headerInner: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  searchBar: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 1100,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
