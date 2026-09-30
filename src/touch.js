export const DOUBLE_TAP_DELAY = 350;
export const TABLET_MIN_WIDTH = 600;
const DOUBLE_TAP_DISTANCE = 30;

export function isTabletTouch(pointer, width) {
  return pointer?.type === 'touch' && width >= TABLET_MIN_WIDTH;
}

export function isSecondTap(previous, pointer, now) {
  return !!previous && now >= previous.time && now - previous.time <= DOUBLE_TAP_DELAY
    && Math.hypot(pointer.x - previous.x, pointer.y - previous.y) <= DOUBLE_TAP_DISTANCE;
}
