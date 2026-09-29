import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE, api, getToken } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button, EmptyState } from "@/src/ui";

type Banner = {
  banner_id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  link: string;
  order: number;
};

type Category = { category_id: string; name: string };

const EMPTY_BANNER: Banner = {
  banner_id: "", title: "", subtitle: "", image: "", cta: "Shop now", link: "", order: 1,
};

export default function AdminBanners() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [banners, cats] = await Promise.all([
        api<Banner[]>("/admin/banners"),
        api<Category[]>("/categories", { auth: false }),
      ]);
      setItems(banners);
      setCategories(cats);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 1800);
  };

  const openCreate = () => {
    const nextOrder = items.reduce((max, banner) => Math.max(max, banner.order), 0) + 1;
    setEditing({ ...EMPTY_BANNER, link: categories[0]?.category_id || "", order: nextOrder });
    setModalOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    const payload = {
      title: editing.title.trim(),
      subtitle: editing.subtitle.trim(),
      image: editing.image.trim(),
      cta: editing.cta.trim(),
      link: editing.link,
      order: Number(editing.order),
    };
    if (!payload.title || !payload.image || !payload.cta || !payload.link) {
      notify("Title, image, button text and destination are required");
      return;
    }
    if (!/^https?:\/\//i.test(payload.image)) {
      notify("Enter a valid image URL");
      return;
    }
    if (!Number.isInteger(payload.order) || payload.order < 0 || payload.order > 10000) {
      notify("Display order must be from 0 to 10000");
      return;
    }
    try {
      if (editing.banner_id) {
        await api(`/admin/banners/${editing.banner_id}`, { method: "PATCH", body: JSON.stringify(payload) });
        notify("Banner updated");
      } else {
        await api("/admin/banners", { method: "POST", body: JSON.stringify(payload) });
        notify("Banner created");
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (error: any) { notify(error?.message || "Save failed"); }
  };

  const remove = async (banner: Banner) => {
    try {
      await api(`/admin/banners/${banner.banner_id}`, { method: "DELETE" });
      notify("Banner deleted");
      load();
    } catch (error: any) { notify(error?.message || "Delete failed"); }
  };

  const confirmRemove = (banner: Banner) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Delete “${banner.title}”?`)) remove(banner);
      return;
    }
    Alert.alert("Delete banner?", banner.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(banner) },
    ]);
  };

  if (user?.role !== "admin") {
    return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Admin only" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable testID="adminbanner-back" onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={typography.h2}>Banners</Text>
        <Pressable testID="adminbanner-new" onPress={openCreate} style={s.newBtn}>
          <Ionicons name="add" size={18} color={colors.onBrand} />
          <Text style={{ color: colors.onBrand, fontWeight: "500" }}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(banner) => banner.banner_id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
        ListEmptyComponent={<EmptyState title={loading ? "Loading…" : "No banners"} subtitle="Tap New to add a banner" />}
        renderItem={({ item }) => (
          <View style={s.card} testID={`adminbanner-${item.banner_id}`}>
            <Image source={{ uri: item.image }} style={s.preview} contentFit="cover" />
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={1} style={s.title}>{item.title}</Text>
              <Text numberOfLines={1} style={s.muted}>{item.subtitle}</Text>
              <Text style={s.meta}>Order {item.order} · {categories.find((cat) => cat.category_id === item.link)?.name || item.link}</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable testID={`edit-${item.banner_id}`} onPress={() => { setEditing({ ...item }); setModalOpen(true); }} style={[s.actionBtn, { backgroundColor: colors.brandSecondary }]}>
                <Ionicons name="pencil" size={14} color={colors.onBrandSecondary} />
              </Pressable>
              <Pressable testID={`delete-${item.banner_id}`} onPress={() => confirmRemove(item)} style={[s.actionBtn, { backgroundColor: "#FBEAEA" }]}>
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      />

      {!!toast && <View style={s.toast} pointerEvents="none"><Text style={{ color: "#fff" }}>{toast}</Text></View>}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <BannerForm
          value={editing}
          categories={categories}
          onChange={setEditing}
          onClose={() => setModalOpen(false)}
          onSave={save}
        />
      </Modal>
    </SafeAreaView>
  );
}

function BannerForm({ value, categories, onChange, onClose, onSave }: {
  value: Banner | null;
  categories: Category[];
  onChange: (value: Banner) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  if (!value) return null;
  const setField = (field: keyof Banner, next: any) => onChange({ ...value, [field]: next });

  const uploadImage = async () => {
    setUploadError("");
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadError("Photo access is required to choose an image");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const form = new FormData();
    if (Platform.OS === "web" && asset.file) form.append("file", asset.file, asset.fileName || asset.file.name);
    else form.append("file", { uri: asset.uri, name: asset.fileName || `banner-${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" } as any);
    setUploading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/admin/upload-image`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Upload failed");
      setField("image", data.url);
    } catch (error: any) { setUploadError(error?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <View style={s.modalRoot}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={s.modalCard} edges={["bottom"]}>
        <View style={s.modalHeader}>
          <Text style={typography.h2}>{value.banner_id ? "Edit banner" : "New banner"}</Text>
          <Pressable testID="banner-form-close" onPress={onClose} style={s.iconBtn}><Ionicons name="close" size={22} color={colors.onSurface} /></Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
            <Field label="Title" value={value.title} onChangeText={(text) => setField("title", text)} maxLength={120} />
            <Field label="Subtitle" value={value.subtitle} onChangeText={(text) => setField("subtitle", text)} maxLength={200} />
            <Field label="Button text" value={value.cta} onChangeText={(text) => setField("cta", text)} maxLength={50} />
            <Field label="Display order" value={String(value.order)} onChangeText={(text) => setField("order", text.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={5} />

            <Text style={s.label}>Destination category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {categories.map((category) => (
                <Pressable key={category.category_id} onPress={() => setField("link", category.category_id)} style={[s.chip, value.link === category.category_id && s.chipActive]}>
                  <Text style={[s.chipText, value.link === category.category_id && s.chipTextActive]}>{category.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={s.imageHeading}>
              <Text style={[s.label, { marginBottom: 0 }]}>Image</Text>
              <Pressable testID="banner-image-upload" onPress={uploadImage} disabled={uploading} style={[s.uploadBtn, uploading && { opacity: 0.55 }]}>
                <Ionicons name="cloud-upload-outline" size={16} color={colors.onBrand} />
                <Text style={s.uploadText}>{uploading ? "Uploading…" : "Upload"}</Text>
              </Pressable>
            </View>
            {!!uploadError && <Text style={{ color: colors.error, fontSize: 12 }}>{uploadError}</Text>}
            {!!value.image && <Image source={{ uri: value.image }} style={s.formPreview} contentFit="cover" />}
            <Field label="Image URL" value={value.image} onChangeText={(text) => setField("image", text)} maxLength={2000} autoCapitalize="none" />
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={s.modalFooter}><Button title={value.banner_id ? "Save changes" : "Create banner"} onPress={onSave} /></View>
      </SafeAreaView>
    </View>
  );
}

function Field({ label, ...props }: { label: string; value: string; onChangeText: (text: string) => void; keyboardType?: any; maxLength?: number; autoCapitalize?: any }) {
  return <View><Text style={s.label}>{label}</Text><TextInput {...props} placeholderTextColor={colors.onSurfaceMuted} style={s.input} /></View>;
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandPrimary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  preview: { width: 92, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  formPreview: { width: "100%", height: 150, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  title: { color: colors.onSurface, fontWeight: "500", fontSize: 15 },
  muted: { color: colors.onSurfaceMuted, fontSize: 12 },
  meta: { color: colors.brandPrimary, fontSize: 11, marginTop: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  toast: { position: "absolute", bottom: 40, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.85)", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "92%", minHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  modalFooter: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceSecondary },
  label: { fontSize: 11, color: colors.onSurfaceMuted, marginBottom: 6, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.onSurface, fontSize: 14 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 12 },
  chipTextActive: { color: colors.onBrand, fontWeight: "500" },
  imageHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandPrimary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 9 },
  uploadText: { color: colors.onBrand, fontWeight: "500", fontSize: 13 },
});