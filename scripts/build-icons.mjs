/**
 * Icon generator.
 *
 * Chrome will not offer to install a PWA without a raster icon of at least
 * 192px — SVG in the manifest is not enough — and iOS needs a PNG
 * apple-touch-icon. This draws the mark and writes real PNGs.
 *
 * ponytail: a zero-dependency encoder rather than pulling in sharp or resvg.
 * The mark is three shapes, the output never changes unless the design does,
 * and a native image dependency that has to build on CI is a poor trade for
 * four static files. Run `npm run icons` after changing the design.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const OUT = 'public'

const INK = [0x1b, 0x18, 0x09] // --color-bg
const ACCENT = [0xeb, 0x7d, 0x00] // --color-accent

// --- PNG encoding ------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** RGBA pixel buffer to a PNG. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  // Each scanline is prefixed with its filter type. 0 (none) keeps this simple
  // and the images compress fine regardless.
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Drawing -----------------------------------------------------------------

/**
 * The mark, in a 0..1 coordinate space so it scales to any size.
 *
 * `inset` shrinks it towards the centre for the maskable variant, whose corners
 * a launcher may crop to a circle.
 */
function drawMark(sample, inset) {
  const c = 0.5
  const s = (v) => c + (v - c) * inset

  // A V60 in section: an open cone, the coffee bed inside it, and a drop below.
  const coneTop = s(0.26)
  const coneLeft = s(0.2)
  const coneRight = s(0.8)
  const coneTip = s(0.68)

  const inCone = (x, y) => {
    if (y < coneTop || y > coneTip) return false
    // Width tapers linearly from the rim to the tip.
    const t = (y - coneTop) / (coneTip - coneTop)
    const halfWidth = ((coneRight - coneLeft) / 2) * (1 - t)
    return Math.abs(x - c) <= halfWidth
  }

  const stroke = 0.045 * inset
  const outline = (x, y) => {
    if (!inCone(x, y)) return false
    const t = (y - coneTop) / (coneTip - coneTop)
    const halfWidth = ((coneRight - coneLeft) / 2) * (1 - t)
    return Math.abs(Math.abs(x - c) - halfWidth) <= stroke / 2 || y - coneTop <= stroke / 2
  }

  // The bed sits in the lower half of the cone.
  const bedTop = coneTop + (coneTip - coneTop) * 0.52
  // Fill right down to the tip: stopping short of it leaves a notch where
  // neither the bed nor the tapering outline covers.
  const bed = (x, y) => y >= bedTop && y <= coneTip && inCone(x, y)

  const dropY = s(0.82)
  const dropR = 0.075 * inset
  const drop = (x, y) => (x - c) ** 2 + (y - dropY) ** 2 <= dropR ** 2

  return (x, y) => outline(x, y) || bed(x, y) || drop(x, y)
}

/** 4x supersampling: without it the diagonals of the cone look ragged. */
const SS = 4

function render(size, { inset = 1, rounded = true } = {}) {
  const mark = drawMark(null, inset)
  const rgba = Buffer.alloc(size * size * 4)
  const radius = rounded ? size * 0.22 : 0

  const insideRoundedSquare = (px, py) => {
    if (!rounded) return true
    const x = Math.min(px, size - px)
    const y = Math.min(py, size - py)
    if (x >= radius || y >= radius) return true
    return (radius - x) ** 2 + (radius - y) ** 2 <= radius ** 2
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0
      let markHits = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          if (!insideRoundedSquare(px, py)) continue
          bgHits++
          if (mark(px / size, py / size)) markHits++
        }
      }

      const total = SS * SS
      const alpha = Math.round((bgHits / total) * 255)
      const markRatio = bgHits > 0 ? markHits / bgHits : 0
      const colour = INK.map((ink, i) => Math.round(ink + (ACCENT[i] - ink) * markRatio))

      const o = (y * size + x) * 4
      rgba[o] = colour[0]
      rgba[o + 1] = colour[1]
      rgba[o + 2] = colour[2]
      rgba[o + 3] = alpha
    }
  }

  return encodePng(size, size, rgba)
}

const files = [
  // Chrome's install criteria want 192 and 512.
  ['icon-192.png', render(192)],
  ['icon-512.png', render(512)],
  // Maskable: full bleed, artwork inside the safe zone, no rounded corners of
  // our own because the launcher applies its own shape.
  ['icon-maskable-512.png', render(512, { inset: 0.7, rounded: false })],
  // iOS ignores the manifest and reads this. It also composites onto white, so
  // the background must be opaque — hence no rounding.
  ['apple-touch-icon.png', render(180, { rounded: false })],
]

for (const [name, data] of files) {
  await writeFile(join(OUT, name), data)
  console.log(`${name.padEnd(24)} ${(data.length / 1024).toFixed(1)} KB`)
}
