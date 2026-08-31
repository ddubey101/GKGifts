import React from "react";
import { Image as RNImage, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

interface HeaderProps {
  showNotifications?: boolean;
  showWishlist?: boolean;
  hPad?: number;
  contentMax?: number;
}

export function AppHeader({ showNotifications = true, showWishlist = true, hPad = 0, contentMax = 1000 }: HeaderProps) {
  const router = useRouter();

  return (
    <View style={[s.centerRow, { paddingHorizontal: hPad, backgroundColor: colors.surface }]}>
      <View style={[s.headerInner, { maxWidth: contentMax }]}>
        <Pressable testID="home-logo" onPress={() => router.push("/(tabs)/home")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <RNImage
            source={require("../assets/images/gk-logo.png")}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
        </Pressable>
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
});
