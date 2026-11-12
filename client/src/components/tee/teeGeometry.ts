/**
 * Shared tee geometry.
 *
 * The 2D mockup draws this outline as an SVG; the 3D preview builds a rounded
 * garment of its own but uses the same viewBox for framing and maps its print
 * with PRINT_AREA, so a design lands in the same place in both views.
 * Placement coordinates are percentages of this viewBox (see TeeCanvas).
 */

export const TEE_VIEW_W = 400
export const TEE_VIEW_H = 460

export const TEE_PATH =
  'M149 36 C 170 62 230 62 251 36 L 294 46 L 366 120 L 338 196 L 300 180 L 308 432 Q 308 442 298 442 L 102 442 Q 92 442 92 432 L 100 180 L 62 196 L 34 120 L 106 46 Z'

/** Collar opening, in viewBox units — used for the 3D neckband. */
export const TEE_COLLAR = {
  from: [149, 36],
  c1: [170, 62],
  c2: [230, 62],
  to: [251, 36],
} as const

/**
 * Printable chest window, in viewBox units. Stickers dragged outside it sit on
 * the sleeves or the very edge of the body, which the 3D preview does not
 * print (real prints stop at the chest too).
 */
export const PRINT_AREA = { x: 116, y: 100, w: 168, h: 300 }
