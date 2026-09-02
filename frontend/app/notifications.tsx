import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { EmptyState } from "@/src/ui";
import { AppHeader } from "@/src/app-header";

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    try { setItems(await api<any[]>("/notifications")); } catch {}
  }, []);
  useEffect(() => {
    load();
    api("/notifications/read-all", { method: "POST" }).catch(() => {});
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <AppHeader title="Notifications" showNotifications={false} showWishlist={false} hPad={spacing.lg} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.notif_id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
        ListEmptyComponent={<EmptyState title="No notifications" subtitle="You'll see order updates and offers here" />}
        renderItem={({ item }) => (
          <View style={s.card} testID={`notif-${item.notif_id}`}>
            <View style={s.iconWrap}><Ionicons name={item.kind === "order" ? "receipt-outline" : "notifications-outline"} size={20} color={colors.brandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "500" }}>{item.title}</Text>
              <Text style={{ color: colors.onSurfaceMuted, marginTop: 2 }}>{item.body}</Text>
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 11, marginTop: 4 }}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
});
