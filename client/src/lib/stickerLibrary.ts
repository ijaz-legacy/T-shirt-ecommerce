import type { StickerCategory } from './catalog'

/**
 * Ready-to-print sticker artwork served from /stickers (built from the shop's
 * image library). Each piece is referenced by its public URL, so it travels
 * with the site — no storage bucket or upload policy needed.
 *
 * NOTE: the URLs here are relative (`./stickers/...`), not absolute (`/stickers/...`).
 * Vite renders them correctly in dev, and a static host such as InfinityFree serves
 * them from dist/stickers/ without a base path mismatch.
 */
export interface LibrarySticker {
  id: string
  name: string
  src: string
  category: StickerCategory
}

const s = (slug: string): string => `./stickers/${slug}.webp`

export const STICKER_GROUPS: { id: StickerCategory; label: string; hint: string }[] = [
  { id: 'small', label: 'Logos & icons', hint: 'Small print · ₹59' },
  { id: 'medium', label: 'Graphic designs', hint: 'Half A4 · ₹59' },
  { id: 'large', label: 'Full print', hint: 'Full A4 · ₹100' },
]

export const STICKER_LIBRARY: LibrarySticker[] = [
  // ── Logos & icons ───────────────────────────────────────────────────
  { id: 'bmw-m-badge', name: 'BMW M Badge', src: s('bmw-m-badge'), category: 'small' },
  { id: 'bmw-roundel-logo', name: 'BMW Roundel', src: s('bmw-roundel-logo'), category: 'small' },
  { id: 'real-madrid-crest', name: 'Real Madrid Crest', src: s('real-madrid-crest'), category: 'small' },
  { id: 'lion-head-logo-silhouette', name: 'Lion Crest', src: s('lion-head-logo-silhouette'), category: 'small' },
  { id: 'black-spider-silhouette', name: 'Black Spider', src: s('black-spider-silhouette'), category: 'small' },
  { id: 'spiderman-wordmark', name: 'Web-Slinger Wordmark', src: s('spiderman-wordmark'), category: 'small' },
  { id: 'thug-life-glasses', name: 'Thug Life', src: s('thug-life-glasses'), category: 'small' },
  { id: 'my-gun-bigger-than-yours', name: 'Bigger Gun', src: s('my-gun-bigger-than-yours'), category: 'small' },
  { id: 'cristiano-ronaldo-signature', name: 'CR7 Signature', src: s('cristiano-ronaldo-signature'), category: 'small' },
  { id: 'comic-speech-bubbles', name: 'Speech Bubbles', src: s('comic-speech-bubbles'), category: 'small' },
  { id: 'wow-comic-burst', name: 'Wow Burst', src: s('wow-comic-burst'), category: 'small' },
  { id: 'pink-paint-splash', name: 'Pink Splash', src: s('pink-paint-splash'), category: 'small' },

  // ── Graphic designs (half A4) ───────────────────────────────────────
  { id: 'motocross-jump-silhouette', name: 'Motocross Jump', src: s('motocross-jump-silhouette'), category: 'medium' },
  { id: 'motocross-backflip-silhouette', name: 'Backflip', src: s('motocross-backflip-silhouette'), category: 'medium' },
  { id: 'motocross-rider-orange', name: 'Orange Rider', src: s('motocross-rider-orange'), category: 'medium' },
  { id: 'moto-rider-46-cartoon', name: 'Rider 46', src: s('moto-rider-46-cartoon'), category: 'medium' },
  { id: 'floral-vine-flourish', name: 'Floral Vine', src: s('floral-vine-flourish'), category: 'medium' },
  { id: 'owl-dreamcatcher', name: 'Owl Dreamcatcher', src: s('owl-dreamcatcher'), category: 'medium' },
  { id: 'skull-roses-snake', name: 'Skull, Rose & Snake', src: s('skull-roses-snake'), category: 'medium' },
  { id: 'skull-wings-cross-tattoo', name: 'Winged Cross Skull', src: s('skull-wings-cross-tattoo'), category: 'medium' },
  { id: 'skull-weapons-crest', name: 'Skull Weapons Crest', src: s('skull-weapons-crest'), category: 'medium' },
  { id: 'skull-guns-splatter', name: 'Skull & Guns', src: s('skull-guns-splatter'), category: 'medium' },
  { id: 'skull-ship-tattoo', name: 'Skull Ship', src: s('skull-ship-tattoo'), category: 'medium' },
  { id: 'white-wolf-face', name: 'White Wolf', src: s('white-wolf-face'), category: 'medium' },
  { id: 'grim-reaper-black-tattoo', name: 'Grim Reaper', src: s('grim-reaper-black-tattoo'), category: 'medium' },
  { id: 'itachi-red-moon-crows', name: 'Red Moon Crows', src: s('itachi-red-moon-crows'), category: 'medium' },
  { id: 'naruto-orange-rasengan-kick', name: 'Rasengan Kick', src: s('naruto-orange-rasengan-kick'), category: 'medium' },
  { id: 'minnie-face-pink-bow', name: 'Minnie Face', src: s('minnie-face-pink-bow'), category: 'medium' },
  { id: 'mickey-mouse-sketch', name: 'Mickey Sketch', src: s('mickey-mouse-sketch'), category: 'medium' },
  { id: 'ronaldo-stencil-roar', name: 'Stencil Roar', src: s('ronaldo-stencil-roar'), category: 'medium' },
  { id: 'soccer-kick-watercolor', name: 'Watercolour Kick', src: s('soccer-kick-watercolor'), category: 'medium' },
  { id: 'ronaldo-trophy-cartoon', name: 'Trophy Lift', src: s('ronaldo-trophy-cartoon'), category: 'medium' },

  // ── Full print (A4) ─────────────────────────────────────────────────
  { id: 'bellingham-wpap-portrait', name: 'Bellingham Portrait', src: s('bellingham-wpap-portrait'), category: 'large' },
  { id: 'naruto-3d-figure', name: 'Naruto Figure', src: s('naruto-3d-figure'), category: 'large' },
  { id: 'naruto-crouching-hand-sign', name: 'Naruto Hand Sign', src: s('naruto-crouching-hand-sign'), category: 'large' },
  { id: 'naruto-team7-collage', name: 'Team 7 Collage', src: s('naruto-team7-collage'), category: 'large' },
  { id: 'naruto-toad-tattoo-art', name: 'Toad Sage', src: s('naruto-toad-tattoo-art'), category: 'large' },
  { id: 'naruto-young-smiling', name: 'Young Naruto', src: s('naruto-young-smiling'), category: 'large' },
  { id: 'ronaldo-holding-ball', name: 'Ronaldo & Ball', src: s('ronaldo-holding-ball'), category: 'large' },
  { id: 'ronaldo-portugal-crossed-arms', name: 'Portugal Folded Arms', src: s('ronaldo-portugal-crossed-arms'), category: 'large' },
  { id: 'ronaldo-portugal-standing', name: 'Portugal Standing', src: s('ronaldo-portugal-standing'), category: 'large' },
  { id: 'ronaldo-real-madrid-back', name: 'Madrid Number 7', src: s('ronaldo-real-madrid-back'), category: 'large' },
  { id: 'ronaldo-real-madrid-shout', name: 'Madrid Shout', src: s('ronaldo-real-madrid-shout'), category: 'large' },
  { id: 'ronaldo-white-sprint', name: 'White Sprint', src: s('ronaldo-white-sprint'), category: 'large' },
  { id: 'messi-barcelona-jersey', name: 'Messi Jersey', src: s('messi-barcelona-jersey'), category: 'large' },
  { id: 'lightning-mcqueen', name: 'Lightning Racer', src: s('lightning-mcqueen'), category: 'large' },
  { id: 'minnie-mouse-posing', name: 'Minnie Posing', src: s('minnie-mouse-posing'), category: 'large' },
]
