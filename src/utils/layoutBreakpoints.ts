export const MOBILE_LAYOUT_MAX_WIDTH = 767;
export const TABLET_LAYOUT_MAX_WIDTH = 1023;
export const EXTRA_WIDE_DESKTOP_MIN_WIDTH = 1280;
export const EXTRA_WIDE_DESKTOP_HEIGHT = 0;

export function getLayoutViewportWidth(fallbackWidth?: number): number {
  const iframeWidth = window.frameElement?.getBoundingClientRect().width ?? 0;
  const documentWidth = document.documentElement?.clientWidth ?? 0;
  const viewportWidth = window.innerWidth ?? 0;
  const resolvedWidth = iframeWidth || fallbackWidth || documentWidth || viewportWidth || 0;
  return Math.floor(resolvedWidth);
}

export function isMobileLayoutWidth(width: number): boolean {
  return width <= MOBILE_LAYOUT_MAX_WIDTH;
}

export function getDesktopExtraHeight(width: number): number {
  return width >= EXTRA_WIDE_DESKTOP_MIN_WIDTH ? EXTRA_WIDE_DESKTOP_HEIGHT : 0;
}
