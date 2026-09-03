// Admin Products management: list, search, create, edit, stock nudge, delete.
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Button, EmptyState } from "@/src/ui";

type Product = {
  product_id: string;
  name: string;
  brand: string;
  category_id: string;
  description?: string;
  price: number;
  mrp: number;
  stock: number;
  images: string[];
  tags?: string[];
  variants?: { name: string; options: string[] }[];
};

type Category = { category_id: string; name: string };

const TAG_OPTIONS = ["flash_sale", "featured", "trending", "new", "deal", "top"];

const EMPTY_FORM: Product = {
  product_id: "",
  name: "",
  brand: "",
  category_id: "cat_home",
  description: "",
  price: 0,
  mrp: 0,
  stock: 0,
  images: [],
  tags: [],
  variants: [],
};

export default function AdminProducts() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api<Product[]>(`/admin/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
        api<Category[]>("/categories", { auth: false }),
      ]);
      setItems(p);
      setCats(c);
    } finally { setLoading(false); }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const notify = (m: string) => {
    setToast(m); setTimeout(() => setToast(""), 1600);
  };

  const openCreate = () => { setEditing({ ...EMPTY_FORM }); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing({ ...p, tags: p.tags || [], variants: p.variants || [] }); setModalOpen(true); };

  const remove = async (p: Product) => {
    try {
      await api(`/admin/products/${p.product_id}`, { method: "DELETE" });
      notify("Deleted");
      load();
    } catch (e: any) { notify(e?.message || "Delete failed"); }
  };

  const nudgeStock = async (p: Product, delta: number) => {
    try {
      const r = await api<{ stock: number }>(`/admin/products/${p.product_id}/stock`, {
        method: "PATCH", body: JSON.stringify({ delta }),
      });
      setItems((prev) => prev.map((x) => x.product_id === p.product_id ? { ...x, stock: r.stock } : x));
    } catch (e: any) { notify(e?.message || "Stock update failed"); }
  };

  const save = async () => {
    if (!editing) return;
    const payload = {
      name: editing.name.trim(),
      brand: editing.brand.trim(),
      category_id: editing.category_id,
      description: editing.description || "",
      price: Number(editing.price) || 0,
      mrp: Number(editing.mrp) || 0,
      stock: Number(editing.stock) || 0,
      images: editing.images.filter(Boolean),
      tags: editing.tags || [],
      variants: editing.variants || [],
    };
    if (!payload.name || !payload.brand || payload.price <= 0) {
      notify("Name, brand and price are required");
      return;
    }
    try {
      if (editing.product_id) {
        await api(`/admin/products/${editing.product_id}`, {
          method: "PATCH", body: JSON.stringify(payload),
        });
        notify("Updated");
      } else {
        await api("/admin/products", {
          method: "POST", body: JSON.stringify(payload),
        });
        notify("Created");
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e: any) { notify(e?.message || "Save failed"); }
  };

  if (user?.role !== "admin") {
    return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Admin only" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable testID="adminprod-back" onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={typography.h2}>Products</Text>
        <Pressable testID="adminprod-new" onPress={openCreate} style={s.newBtn}>
          <Ionicons name="add" size={18} color={colors.onBrand} />
          <Text style={{ color: colors.onBrand, fontWeight: "500" }}>New</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={colors.onSurfaceMuted} />
          <TextInput
            testID="adminprod-search"
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or brand"
            placeholderTextColor={colors.onSurfaceMuted}
            style={{ flex: 1, color: colors.onSurface, fontSize: 14 }}
            returnKeyType="search"
          />
          {!!q && (
            <Pressable onPress={() => setQ("")} testID="adminprod-search-clear">
              <Ionicons name="close-circle" size={16} color={colors.onSurfaceMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.product_id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
        ListEmptyComponent={
          <View style={{ paddingTop: spacing.xxl }}>
            <EmptyState title={loading ? "Loading…" : "No products"} subtitle={q ? "Try a different search" : "Tap New to add your first product"} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card} testID={`adminprod-${item.product_id}`}>
            <Image source={{ uri: item.images?.[0] }} style={s.thumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 11, color: colors.onSurfaceMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.brand}</Text>
              <Text numberOfLines={2} style={{ fontWeight: "500", color: colors.onSurface }}>{item.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Text style={{ fontWeight: "500" }}>₹{item.price.toLocaleString("en-IN")}</Text>
                {item.mrp > item.price && (
                  <Text style={{ color: colors.onSurfaceMuted, fontSize: 12, textDecorationLine: "line-through" }}>₹{item.mrp}</Text>
                )}
              </View>
              <View style={s.stockRow}>
                <Pressable testID={`stock-dec-${item.product_id}`} onPress={() => nudgeStock(item, -1)} style={s.stockBtn}><Ionicons name="remove" size={14} color={colors.onSurface} /></Pressable>
                <Text style={[s.stockValue, item.stock < 10 && { color: colors.error }]}>{item.stock}</Text>
                <Pressable testID={`stock-inc-${item.product_id}`} onPress={() => nudgeStock(item, +1)} style={s.stockBtn}><Ionicons name="add" size={14} color={colors.onSurface} /></Pressable>
                <Text style={{ color: colors.onSurfaceMuted, fontSize: 11, marginLeft: 4 }}>in stock</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable testID={`edit-${item.product_id}`} onPress={() => openEdit(item)} style={[s.actionBtn, { backgroundColor: colors.brandSecondary }]}> 
                <Ionicons name="pencil" size={14} color={colors.onBrandSecondary} />
              </Pressable>
              <Pressable testID={`delete-${item.product_id}`} onPress={() => remove(item)} style={[s.actionBtn, { backgroundColor: "#FBEAEA" }]}> 
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      />

      {!!toast && (
        <View style={s.toast} pointerEvents="none"><Text style={{ color: "#fff" }}>{toast}</Text></View>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <ProductForm
          value={editing}
          onChange={setEditing}
          cats={cats}
          onClose={() => setModalOpen(false)}
          onSave={save}
        />
      </Modal>
    </SafeAreaView>
  );
}

function ProductForm({
  value, onChange, cats, onClose, onSave,
}: {
  value: Product | null;
  onChange: (p: Product) => void;
  cats: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  if (!value) return null;
  const isEdit = !!value.product_id;

  const setField = (k: keyof Product, v: any) => onChange({ ...value, [k]: v });
  const setImage = (i: number, url: string) => {
    const imgs = [...value.images];
    imgs[i] = url;
    setField("images", imgs.filter((x, idx) => x || idx === imgs.length - 1));
  };
  const addImage = () => setField("images", [...value.images, ""]);
  const removeImage = (i: number) => setField("images", value.images.filter((_, idx) => idx !== i));
  const toggleTag = (tag: string) => {
    const t = value.tags || [];
    setField("tags", t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]);
  };

  return (
    <View style={s.modalRoot}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={s.modalCard} edges={["bottom"]}>
        <View style={s.modalHeader}>
          <Text style={typography.h2}>{isEdit ? "Edit product" : "New product"}</Text>
          <Pressable testID="form-close" onPress={onClose} style={s.iconBtn}>
            <Ionicons name="close" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <Field label="Name" testID="form-name" value={value.name} onChangeText={(v) => setField("name", v)} />
            <Field label="Brand" testID="form-brand" value={value.brand} onChangeText={(v) => setField("brand", v)} />

            <Text style={s.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: spacing.lg }}>
              {cats.map((c) => {
                const active = value.category_id === c.category_id;
                return (
                  <Pressable
                    key={c.category_id}
                    testID={`form-cat-${c.category_id}`}
                    onPress={() => setField("category_id", c.category_id)}
                    style={[s.chip, active && s.chipActive]}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Price (₹)" testID="form-price" value={String(value.price || "")} onChangeText={(v) => setField("price", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="MRP (₹)" testID="form-mrp" value={String(value.mrp || "")} onChangeText={(v) => setField("mrp", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Stock" testID="form-stock" value={String(value.stock || "")} onChangeText={(v) => setField("stock", v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" /></View>
            </View>

            <Field
              label="Description"
              testID="form-description"
              value={value.description || ""}
              onChangeText={(v) => setField("description", v)}
              multiline
            />

            <Text style={s.label}>Tags</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TAG_OPTIONS.map((t) => {
                const active = value.tags?.includes(t);
                return (
                  <Pressable key={t} testID={`form-tag-${t}`} onPress={() => toggleTag(t)} style={[s.chip, active && s.chipActive]}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{t.replace("_", " ")}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.label}>Images (URLs)</Text>
            {value.images.map((img, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {!!img && <Image source={{ uri: img }} style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: colors.surfaceTertiary }} contentFit="cover" />}
                <TextInput
                  testID={`form-img-${i}`}\n                  value={img}\n                  onChangeText={(v) => setImage(i, v)}
                  placeholder="https://…"
                  placeholderTextColor={colors.onSurfaceMuted}
                  style={[s.input, { flex: 1 }]}
                  autoCapitalize="none"
                />
                <Pressable testID={`form-img-del-${i}`} onPress={() => removeImage(i)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.onSurfaceMuted} />
                </Pressable>
              </View>
            ))}
            <Pressable testID="form-img-add" onPress={addImage} style={s.addBtn}>
              <Ionicons name="add" size={16} color={colors.brandPrimary} />
              <Text style={{ color: colors.brandPrimary, fontWeight: "500" }}>Add image</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={s.modalFooter}>
          <Button testID="form-save" title={isEdit ? "Save changes" : "Create product"} onPress={onSave} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label, value, onChangeText, testID, keyboardType, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  testID?: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={colors.onSurfaceMuted}
        style={[s.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  newBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandPrimary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999,
  },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  card: {
    flexDirection: "row", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  stockBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center",
  },
  stockValue: { minWidth: 26, textAlign: "center", fontWeight: "500", color: colors.onSurface },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  toast: {
    position: "absolute", bottom: 40, alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
  },

  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    maxHeight: "92%", minHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  modalFooter: {
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  label: {
    fontSize: 11, color: colors.onSurfaceMuted, marginBottom: 6, marginTop: 4,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
    color: colors.onSurface, fontSize: 14,
  },
  chip: {
    height: 34, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 12 },
  chipTextActive: { color: colors.onBrand, fontWeight: "500" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, alignSelf: "flex-start",
  },
});