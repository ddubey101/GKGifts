import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/auth";
import { CartProvider } from "@/src/cart-store";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

const isWeb = Platform.OS === "web";

// Screens that still require a signed-in shopper. Everything else —
// home, search, categories, product pages, the cart — is open to guests.
const PROTECTED_TOP: string[] = ["checkout", "addresses", "wishlist", "notifications"];
const PROTECTED_TAB: string[] = ["orders"];

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    const second = segments[1];
    const inAuth = first === "(auth)";
    const isAdminArea = first === "admin";
    const needsAuth =
      PROTECTED_TOP.includes(first as string) ||
      (first === "(tabs)" && PROTECTED_TAB.includes(second as string));

    if (isAdminArea) {
      if (!user) router.replace("/(auth)/admin-login");
      else if (user.role !== "admin") router.replace("/(tabs)/home");
      return;
    }

    if (!user && needsAuth) {
      const next = "/" + segments.join("/");
      router.replace(`/(auth)/login?redirect=${encodeURIComponent(next)}`);
      return;
    }

    if (user && inAuth) {
      if (second === "admin-login") router.replace(user.role === "admin" ? "/admin" : "/(tabs)/home");
      else router.replace("/(tabs)/home");
    }
  }, [user, loading, segments, router]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F9F9F8" } }} />;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
    if (isWeb && typeof document !== "undefined") {
      document.title = "GK Gifts";
    }
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <AuthProvider>
            <CartProvider>
              <View style={styles.page}>
                <Gate />
              </View>
            </CartProvider>
          </AuthProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1, backgroundColor: "#F9F9F8" },
});
