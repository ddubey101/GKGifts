import React from "react";
import { View, Pressable, Text, Image as RNImage, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { useResponsiveCols } from "@/src/use-responsive-cols";
import { colors, spacing, typography } from "@/src/theme";

export default function Header({ title, showBack }: { title?: string; showBack?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { hPad, contentMax } = useResponsiveCols();

  return (
    <View style={[styles.container, { paddingHorizontal: hPad }]}> 
      <View style={[styles.inner, { maxWidth: contentMax }]}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable testID="header-back" onPress={() => router.back()} style={styles.btn}>
              <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
            </Pressable>
          ) : (
            <Pressable testID="home-logo" onPress={() => router.push("/(tabs)/home")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <RNImage source={require("../assets/images/gk-logo.png")} style={{ width: 36, height: 36 }} resizeMode="contain" />
            </Pressable>
          )}
        </View>

        <View style={styles.center}>
          {title ? (
            <Text style={typography.h2}>{title}</Text>
          ) : (
            <Pressable testID="header-search" onPress={() => router.push("/(tabs)/search")} style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.onSurfaceMuted} />
              <Text style={{ marginLeft: 8, color: colors.onSurfaceMuted }}>Search for products, brands…</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.right}>
          <Pressable testID="header-notifications" onPress={() => router.push("/notifications")} style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="header-wishlist" onPress={() => router.push("/wishlist")} style={styles.headerBtn}>
            <Ionicons name="heart-outline" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, alignItems: "center" },
  inner: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  left: { width: 100, alignItems: "flex-start", paddingLeft: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  right: { width: 100, flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchBar: { backgroundColor: colors.surfaceSecondary, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: 8, flexDirection: "row", alignItems: "center" },
});
