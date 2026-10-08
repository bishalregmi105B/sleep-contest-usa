/**
 * A 1x1 blurred pixel used as the blurDataURL placeholder.
 *
 * Static rather than generated per image so it costs nothing at build time and
 * cannot 404. The optimizer writes per-image placeholders into
 * design/stitch/OPTIMIZED_IMAGES.json; this is the always-safe default.
 */
export const PLACEHOLDER =
  'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==';