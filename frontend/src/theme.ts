// Gk Gifts theme tokens.
export const colors = {
  surface: "#F9F9F8",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#F2F2F0",
  onSurface: "#1A1A1A",
  onSurfaceMuted: "#6B6B6B",
  onSurfaceTertiary: "#4A4A4A",
  brand: "#D35400",
  brandPrimary: "#E65C00",
  brandSecondary: "#FFE8DB",
  onBrand: "#FFFFFF",
  onBrandSecondary: "#A34100",
  success: "#2D7A4A",
  warning: "#B8860B",
  error: "#CC3333",
  border: "#E8E8E6",
  borderStrong: "#CCCCCC",
  overlay: "rgba(0,0,0,0.45)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const typography = {
  family: "System",
  h1: { fontSize: 24, fontWeight: "500" as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "500" as const, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: "500" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  small: { fontSize: 12, fontWeight: "400" as const },
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};
