import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button } from "@/src/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useAuth } from "@/src/auth";

// Dedicated admin sign-in. Talks to the separate /admin/auth/login API,
// which rejects any account that is not an admin.
export default function AdminLogin() {
  const router = useRouter();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      await adminLogin(email.trim(), password);
      router.replace("/admin");
    } catch (e: any) {
      setErr(e?.message || "Admin login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
            <Image
              source={require("../../assets/images/gk-logo.png")}
              style={s.logo}
              resizeMode="contain"
            />
            <View style={s.badge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.onBrandSecondary} />
              <Text style={{ color: colors.onBrandSecondary, fontSize: 11, fontWeight: "500" }}>ADMIN AREA</Text>
            </View>
            <Text style={[typography.h2, { marginTop: spacing.md }]}>Admin sign in</Text>
            <Text style={{ color: colors.onSurfaceMuted, marginTop: 4 }}>Staff accounts only</Text>
          </View>

          <Text style={s.label}>Admin email</Text>
          <TextInput
            testID="admin-login-email-input"
            value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"
            style={s.input} placeholder="admin@gkgifts.com" placeholderTextColor={colors.onSurfaceMuted}
          />
          <Text style={s.label}>Password</Text>
          <TextInput
            testID="admin-login-password-input"
            value={password} onChangeText={setPassword}
            secureTextEntry style={s.input} placeholder="••••••••" placeholderTextColor={colors.onSurfaceMuted}
          />
          {!!err && <Text style={s.err}>{err}</Text>}
          <Button testID="admin-login-submit-button" title="Sign in as admin" onPress={submit} loading={busy} style={{ marginTop: spacing.lg }} />

          <Pressable
            testID="admin-go-shop"
            onPress={() => router.replace("/(tabs)/home")}
            style={{ marginTop: spacing.xl, alignItems: "center" }}
          >
            <Text style={{ color: colors.onSurfaceMuted }}>
              Not staff? <Text style={{ color: colors.brandPrimary, fontWeight: "500" }}>Back to shop</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  logo: { width: 84, height: 84 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, backgroundColor: colors.brandSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  label: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: spacing.md, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15, color: colors.onSurface },
  err: { color: colors.error, marginTop: spacing.md },
});
