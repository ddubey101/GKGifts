// Reusable UI atoms.
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "./theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}) {
  const s =
    variant === "primary"
      ? btn.primary
      : variant === "secondary"
      ? btn.secondary
      : btn.ghost;
  const t =
    variant === "primary"
      ? btn.primaryText
      : variant === "secondary"
      ? btn.secondaryText
      : btn.ghostText;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s,
        style,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.brand} />
      ) : (
        <Text style={t}>{title}</Text>
      )}
    </Pressable>
  );
}

const btn = StyleSheet.create({
  primary: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryText: { color: colors.onBrand, fontSize: 15, fontWeight: "500" },
  secondary: {
    backgroundColor: colors.brandSecondary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    minHeight: 48,
  },
  secondaryText: { color: colors.onBrandSecondary, fontSize: 15, fontWeight: "500" },
  ghost: {
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  ghostText: { color: colors.onSurface, fontSize: 15, fontWeight: "500" },
});

export function Price({ price, mrp, size = 16 }: { price: number; mrp?: number; size?: number }) {
  const off = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.xs }}>
      <Text style={{ fontSize: size, fontWeight: "500", color: colors.onSurface }}>₹{price.toLocaleString("en-IN")}</Text>
      {!!mrp && mrp > price && (
        <Text style={{ fontSize: size - 4, color: colors.onSurfaceMuted, textDecorationLine: "line-through" }}>
          ₹{mrp.toLocaleString("en-IN")}
        </Text>
      )}
      {off > 0 && (
        <Text style={{ fontSize: size - 4, color: colors.success, fontWeight: "500" }}>{off}% off</Text>
      )}
    </View>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={rating.pill}>
        <Text style={rating.star}>★</Text>
        <Text style={rating.value}>{value.toFixed(1)}</Text>
      </View>
      {count != null && <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>({count})</Text>}
    </View>
  );
}
const rating = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 },
  star: { color: "#fff", fontSize: 10 },
  value: { color: "#fff", fontSize: 11, fontWeight: "500" },
});

export function EmptyState({ title, subtitle, cta, onCta }: { title: string; subtitle?: string; cta?: string; onCta?: () => void }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.md }}>
      <Text style={{ ...typography.h2, color: colors.onSurface }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.onSurfaceMuted, textAlign: "center" }}>{subtitle}</Text>}
      {!!cta && <Button title={cta} onPress={onCta} style={{ paddingHorizontal: 24 }} />}
    </View>
  );
}
