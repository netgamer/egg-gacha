/**
 * Composite thumbnails for the gallery grid.
 *
 * A gallery card would otherwise stack six layers per dragon (dozens of decoded
 * bitmaps and six draw calls each). Baking one 4:5 canvas per dragon keeps the
 * grid light and still shows exactly the same lit composite as the reveal card:
 * the thumbnail runs the same environment passes at 240x300.
 */
import { loadDragonArt, composeUrl } from './dragon-compose.js';

const thumbCache = new Map();
const BLANK =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export { BLANK };

export async function dragonThumb(dragon, base, width = 240) {
  const key = `${dragon.id}@${width}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const layers = await loadDragonArt(dragon, base, { small: width <= 256 });
  if (!layers) return '';
  const url = composeUrl(layers, width, Math.round((width * 5) / 4), { grain: width > 256 });
  if (url) thumbCache.set(key, url);
  return url;
}

export function clearThumbs() {
  thumbCache.clear();
}
