import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button } from "@/src/ui";

export default function Addresses() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });

  const load = useCallback(async () => setItems(await api<any[]>("/addresses")), []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.pincode) return;
    await api("/addresses", { method: "POST", body: JSON.stringify({ ...form, is_default: items.length === 0 }) });
    setShow(false);
    setForm({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    load();
  };
  const del = async (id: string) => { await api(`/addresses/${id}`, { method: "DELETE" }); load(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable testID="addr-back" onPress={() => router.back()} style={s.btn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={typography.h2}>Addresses</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }} keyboardShouldPersistTaps="handled">
          {items.map((a) => (
            <View key={a.address_id} style={s.card} testID={`addr-item-${a.address_id}`}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "500" }}>{a.label} • {a.full_name}</Text>
                <Text style={{ color: colors.onSurfaceMuted, marginTop: 2 }}>{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</Text>
                <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{a.phone}</Text>
              </View>
              <Pressable testID={`addr-del-${a.address_id}`} onPress={() => del(a.address_id)}><Ionicons name="trash-outline" size={20} color={colors.error} /></Pressable>
            </View>
          ))}
          {show ? (
            <View style={[s.card, { flexDirection: "column", gap: 8 }]}>
              {(["full_name", "phone", "line1", "line2", "city", "state", "pincode"] as const).map((k) => (
                <TextInput key={k} testID={`addr-form-${k}`} value={(form as any)[k]} onChangeText={(v) => setForm({ ...form, [k]: v })} placeholder={k.replace("_", " ")} placeholderTextColor={colors.onSurfaceMuted} style={s.input} />
              ))}
              <Button testID="addr-save" title="Save" onPress={add} />
            </View>
          ) : (
            <Button testID="addr-new" title="Add new address" variant="secondary" onPress={() => setShow(true)} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.onSurface },
});
