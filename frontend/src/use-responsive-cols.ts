// Web-friendly responsive helpers. All values are safe on native too — the
// hook just returns the mobile breakpoint values when the window is narrow.
import { useWindowDimensions } from "react-native";

export type LayoutInfo = {
  width: number;
  cols: number;         // grid columns for product cards
  railCard: number;     // width of a card in a horizontal rail
  hPad: number;         // outer horizontal padding
  contentMax: number;   // max content width; content is centered above this
  bannerWidth: number;  // banner card width in the top carousel
  isWide: boolean;      // true on tablet+
};

// Breakpoints tuned for the product grid: 2 cols on phones, 5 on desktop.
export function useResponsiveCols(): LayoutInfo {
  const { width } = useWindowDimensions();

  let cols = 2;
  let railCard = 160;
  let hPad = 16;
  let contentMax = 1440;
  let bannerWidth = Math.min(width, 640) - 32;

  if (width >= 1400) {
    cols = 5;
    railCard = 220;
    hPad = 40;
    bannerWidth = 640;
  } else if (width >= 1100) {
    cols = 4;
    railCard = 210;
    hPad = 32;
    bannerWidth = 600;
  } else if (width >= 820) {
    cols = 3;
    railCard = 200;
    hPad = 24;
    bannerWidth = 540;
  } else if (width >= 620) {
    cols = 3;
    railCard = 180;
    hPad = 20;
    bannerWidth = Math.min(width - 40, 500);
  }

  return { width, cols, railCard, hPad, contentMax, bannerWidth, isWide: width >= 820 };
}
