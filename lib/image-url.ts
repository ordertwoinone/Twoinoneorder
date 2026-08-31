/**
 * Asking Supabase storage for an image at the size it will actually be shown.
 *
 * Every photo in the media bucket is stored full-size — 1600px, a couple of
 * hundred kilobytes — because that is what an admin uploads and what a hero
 * banner needs. A till grid showing thirty of them at 150px wide was pulling
 * several megabytes to draw a few hundred pixels each, and on a café tablet
 * that is the difference between a screen that responds and one that does not.
 *
 * Supabase serves resized copies from /render/image/ and caches them at the
 * edge, so this costs one transform the first time and nothing after. It is not
 * Next's optimizer: that one is switched off, having run out of allowance and
 * started answering 402 — see next.config.mjs.
 *
 * Anything that is not a Supabase storage URL is returned untouched, so callers
 * can hand it whatever an admin typed into the field.
 */

const PUBLIC_OBJECT = "/storage/v1/object/public/";
const RENDER_IMAGE = "/storage/v1/render/image/public/";

/** Widths worth asking for. Fewer variants means more cache hits per variant. */
export type ImageWidth = 200 | 300 | 400 | 600 | 900 | 1400;

export function sizedImage(url: string | null | undefined, width: ImageWidth, quality = 72): string {
  const src = (url ?? "").trim();
  if (!src || !src.includes(PUBLIC_OBJECT)) return src;

  /* An SVG has no pixels to resample and the transformer refuses it; a GIF
     comes back as a still frame, which silently kills the animation. */
  if (/\.(svg|gif)(\?|#|$)/i.test(src)) return src;

  const base = src.split("?")[0].replace(PUBLIC_OBJECT, RENDER_IMAGE);
  return `${base}?width=${width}&quality=${quality}`;
}
