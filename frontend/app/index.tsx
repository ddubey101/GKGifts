import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "@/src/theme";

// Rendered while the Gate in _layout decides where to redirect.
// If we're still here after 6s (bundle downloaded but auth check stalled),
// surface a manual escape hatch so the user is never trapped on a spinner.
export default function Index() {
  const router = useRouter();
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStalled(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const hardReload = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.replace("/(auth)/login");
    }
  };

  return (
    <View style={styles.root} testID="app-loading">
      <Image
        source={require("../assets/images/gk-logo.png")}
        style={{ width: 96, height: 96 }}
        contentFit="contain"
      />
      <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.lg }} />
      <Text style={styles.brand}>Gk Gifts</Text>

      {stalled && (
        <View style={styles.stallBox} testID="app-loading-stalled">
          <Text style={styles.stallTitle}>Taking longer than usual…</Text>
          <Text style={styles.stallHint}>Check your connection, then tap below to continue.</Text>
          <Pressable testID="app-loading-retry" onPress={hardReload} style={styles.retry}>
            <Text style={styles.retryText}>Continue to sign in</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, paddingHorizontal: spacing.xl },
  brand: { ...typography.h3, color: colors.onSurface, marginTop: spacing.md },
  stallBox: { marginTop: spacing.xxl, alignItems: "center", gap: 6 },
  stallTitle: { ...typography.h3, color: colors.onSurface },
  stallHint: { color: colors.onSurfaceMuted, fontSize: 13, textAlign: "center" },
  retry: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { color: colors.onBrand, fontWeight: "500" },
});
