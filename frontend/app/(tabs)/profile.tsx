import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { Button, EmptyState } from "@/src/ui";

type Row = { icon: any; label: string; href: string; testID: string };

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Sign in" cta="Login" onCta={() => router.push("/(auth)/login")} /></SafeAreaView>;
  }

  const rows: Row[] = [
    { icon: "heart-outline", label: "Wishlist", href: "/wishlist", testID: "profile-wishlist" },
    { icon: "location-outline", label: "Addresses", href: "/addresses", testID: "profile-addresses" },
    { icon: "pricetag-outline", label: "Offers & Coupons", href: "/offers", testID: "profile-offers" },
    { icon: "notifications-outline", label: "Notifications", href: "/notifications", testID: "profile-notifications" },
  ];
  if (user.role === "admin") {
    rows.push({ icon: "shield-checkmark-outline", label: "Admin Dashboard", href: "/admin", testID: "profile-admin" });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <View style={s.hero}>
          <View style={s.avatar}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <Text style={{ color: colors.onBrand, fontSize: 24, fontWeight: "500" }}>{user.name?.[0]?.toUpperCase() || "U"}</Text>
            )}
          </View>
          <Text style={[typography.h2, { marginTop: spacing.md }]}>{user.name}</Text>
          <Text style={{ color: colors.onSurfaceMuted }}>{user.email}</Text>
          {user.role === "admin" && (
            <View style={s.roleBadge}><Text style={{ color: colors.onBrandSecondary, fontSize: 11, fontWeight: "500" }}>ADMIN</Text></View>
          )}
        </View>

        <View style={s.rows}>
          {rows.map((r) => (
            <Pressable key={r.href} testID={r.testID} onPress={() => router.push(r.href as any)} style={s.row}>
              <View style={s.rowIcon}><Ionicons name={r.icon} size={20} color={colors.onSurface} /></View>
              <Text style={{ flex: 1, fontSize: 15, color: colors.onSurface, fontWeight: "500" }}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
            </Pressable>
          ))}
        </View>

        <Button testID="logout-btn" variant="ghost" title="Sign out" onPress={logout} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  roleBadge: { marginTop: 8, backgroundColor: colors.brandSecondary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  rows: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
});
