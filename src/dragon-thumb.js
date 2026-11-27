/**
 * Composite thumbnails for the gallery grid.
 *
 * A gallery card would otherwise stack six 512px layers per dragon (dozens of
 * decoded bitmaps at once). Baking each dragon to one small canvas keeps the
 * grid light and still shows the exact same composite as the reveal card.
 */
import { dragonLayers } from './dragon.js';

const imgCache = new Map();
const thumbCache = new Map();
const BLANK =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export { BLANK };

function loadImage(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imgCache.set(url, p);
  return p;
}

export async function dragonThumb(dragon, base, size = 256) {
  const key = `${dragon.id}@${size}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const layers = dragonLayers(dragon, base);
  const small = size <= 256;
  const imgs = [];
  for (const l of layers) {
    // one layer at a time keeps the decode peak low on phones
    const img = await loadImage(base + (small && l.part.thumb ? l.part.thumb : l.part.img));
    if (!img) return '';
    imgs.push(img);
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  for (const img of imgs) ctx.drawImage(img, 0, 0, size, size);
  let url = '';
  try {
    url = canvas.toDataURL('image/webp', 0.88);
  } catch (_) {
    url = '';
  }
  if (!url || url.length < 64) url = canvas.toDataURL('image/png');
  thumbCache.set(key, url);
  return url;
}

export function clearThumbs() {
  thumbCache.clear();
}
