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

export default function Login() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState("demo@gkgifts.com");
  const [password, setPassword] = useState("Demo@123");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true); setErr("");
    try { await login(email.trim(), password); }
    catch (e: any) { setErr(e?.message || "Login failed"); }
    finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true); setErr("");
    try { await googleLogin(); }
    catch (e: any) { setErr(e?.message || "Google login failed"); }
    finally { setBusy(false); }
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
            <Text style={[typography.h1, { marginTop: spacing.md }]}>Welcome to Gk Gifts</Text>
            <Text style={{ color: colors.onSurfaceMuted, marginTop: 4 }}>Sign in to continue shopping</Text>
          </View>

          <Text style={s.label}>Email</Text>
          <TextInput
            testID="login-email-input"
            value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"
            style={s.input} placeholder="you@example.com" placeholderTextColor={colors.onSurfaceMuted}
          />
          <Text style={s.label}>Password</Text>
          <TextInput
            testID="login-password-input"
            value={password} onChangeText={setPassword}
            secureTextEntry style={s.input} placeholder="••••••••" placeholderTextColor={colors.onSurfaceMuted}
          />
          {!!err && <Text style={s.err}>{err}</Text>}
          <Button testID="login-submit-button" title="Sign In" onPress={submit} loading={busy} style={{ marginTop: spacing.lg }} />

          <View style={s.divider}><View style={s.line} /><Text style={s.or}>or</Text><View style={s.line} /></View>

          <Pressable testID="google-login-button" onPress={google} style={s.google}>
            <Ionicons name="logo-google" size={18} color={colors.onSurface} />
            <Text style={{ fontWeight: "500", color: colors.onSurface }}>Continue with Google</Text>
          </Pressable>

          <Pressable
            testID="go-register-link"
            onPress={() => router.push("/(auth)/register")}
            style={{ marginTop: spacing.xl, alignItems: "center" }}
          >
            <Text style={{ color: colors.onSurfaceMuted }}>
              New here? <Text style={{ color: colors.brandPrimary, fontWeight: "500" }}>Create account</Text>
            </Text>
          </Pressable>

          <View style={s.hint}>
            <Text style={s.hintTitle}>Demo credentials</Text>
            <Text style={s.hintText}>Customer: demo@gkgifts.com / Demo@123</Text>
            <Text style={s.hintText}>Admin: admin@gkgifts.com / Admin@123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  logo: { width: 96, height: 96 },
  label: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: spacing.md, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15, color: colors.onSurface },
  err: { color: colors.error, marginTop: spacing.md },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xl, gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.onSurfaceMuted, fontSize: 12 },
  google: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 14, minHeight: 48 },
  hint: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.brandSecondary, borderRadius: radius.md },
  hintTitle: { color: colors.onBrandSecondary, fontWeight: "500", marginBottom: 4 },
  hintText: { color: colors.onBrandSecondary, fontSize: 12 },
});
