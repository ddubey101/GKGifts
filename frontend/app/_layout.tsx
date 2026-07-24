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

// On web, constrain the app to a phone-width column centered on screen so
// wide monitors don't stretch the mobile-first UI. Native / Expo Go keep
// the full-width layout unchanged.
const APP_MAX_WIDTH = 480;
const isWeb = Platform.OS === "web";

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/login");
    else if (user && inAuth) router.replace("/(tabs)/home");
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
              <View style={isWeb ? styles.webPage : styles.nativePage}>
                <View style={isWeb ? styles.webApp : styles.nativeApp}>
                  <Gate />
                </View>
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
  // Native (Expo Go / iOS / Android build): fill the device.
  nativePage: { flex: 1, backgroundColor: "#F9F9F8" },
  nativeApp: { flex: 1, backgroundColor: "#F9F9F8" },
  // Web: dark neutral outside the app "phone", app itself capped at 480px.
  webPage: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh" as any,
  },
  webApp: {
    flex: 1,
    width: "100%",
    maxWidth: APP_MAX_WIDTH,
    backgroundColor: "#F9F9F8",
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 8px 40px rgba(0,0,0,0.25)" } as any)
      : {}),
  },
});
