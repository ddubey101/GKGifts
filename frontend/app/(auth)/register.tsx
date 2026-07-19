import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true); setErr("");
    try { await register(name.trim(), email.trim(), password); }
    catch (e: any) { setErr(e?.message || "Registration failed"); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={{ marginBottom: spacing.lg }} testID="register-back">
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={typography.h1}>Create account</Text>
          <Text style={{ color: colors.onSurfaceMuted, marginTop: 4 }}>Start shopping in seconds</Text>

          <Text style={s.label}>Full Name</Text>
          <TextInput testID="reg-name" value={name} onChangeText={setName} style={s.input} placeholder="Your name" placeholderTextColor={colors.onSurfaceMuted} />
          <Text style={s.label}>Email</Text>
          <TextInput testID="reg-email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={s.input} placeholder="you@example.com" placeholderTextColor={colors.onSurfaceMuted} />
          <Text style={s.label}>Password</Text>
          <TextInput testID="reg-password" value={password} onChangeText={setPassword} secureTextEntry style={s.input} placeholder="Min 6 chars" placeholderTextColor={colors.onSurfaceMuted} />
          {!!err && <Text style={{ color: colors.error, marginTop: spacing.md }}>{err}</Text>}
          <Button testID="reg-submit" title="Create account" onPress={submit} loading={busy} style={{ marginTop: spacing.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  label: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: spacing.md, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15, color: colors.onSurface },
});
