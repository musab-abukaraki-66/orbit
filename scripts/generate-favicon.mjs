import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"

const OUT = path.join(process.cwd(), "app", "favicon.ico")
const SIZES = [16, 32, 48]
const COLOR = { r: 0x97, g: 0x67, b: 0xff }
const COS = Math.cos((26 * Math.PI) / 180)
const SIN = Math.sin((26 * Math.PI) / 180)
const RX = 8
const RY = 5
const CY = 12.5
const FRONT_ALPHA = 1
const FAR_ALPHA = 0.45

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const smooth = (edge, width, d) => clamp((edge - d) / width, 0, 1)

function render(size) {
  const scale = 24 / size
  const px = new Float64Array(size * size)
  const ss = 3
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const gx = (x + (sx + 0.5) / ss) * scale
          const gy = (y + (sy + 0.5) / ss) * scale
          const dx = gx - 12
          const dy = gy - CY
          const lx = dx * COS - dy * SIN
          const ly = dx * SIN + dy * COS
          const rho = Math.hypot(lx / RX, ly / RY)
          let alpha = 0
          const ring = smooth(1, 0.7, Math.abs(rho - 1) * RY)
          if (ring > 0) {
            alpha = Math.max(alpha, ring * (ly < 0 ? FRONT_ALPHA : FAR_ALPHA))
          }
          const star = smooth(1.9, 0.7, Math.hypot(lx + 6.245, ly))
          alpha = Math.max(alpha, star)
          const planet = smooth(1.5, 0.7, Math.hypot(lx - 8, ly))
          alpha = Math.max(alpha, planet)
          acc += alpha
        }
      }
      px[y * size + x] = clamp(acc / (ss * ss), 0, 1)
    }
  }
  return px
}

function dib(size, px) {
  const header = Buffer.alloc(40)
  header.writeInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8)
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  header.writeUInt32LE(0, 16)
  header.writeInt32LE(0, 20)
  const xor = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = Math.round(px[(size - 1 - y) * size + x] * 255)
      const o = (y * size + x) * 4
      xor[o] = COLOR.b
      xor[o + 1] = COLOR.g
      xor[o + 2] = COLOR.r
      xor[o + 3] = a
    }
  }
  const maskRow = Math.ceil(size / 32) * 4
  const mask = Buffer.alloc(maskRow * size)
  return Buffer.concat([header, xor, mask])
}

function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = []
  const blobs = []
  for (const { size, data } of images) {
    const e = Buffer.alloc(16)
    e[0] = size
    e[1] = size
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    entries.push(e)
    blobs.push(data)
    offset += data.length
  }
  return Buffer.concat([header, ...entries, ...blobs])
}

const images = SIZES.map((size) => ({ size, data: dib(size, render(size)) }))
mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, ico(images))
console.log(`wrote ${OUT} (${images.length} sizes: ${SIZES.join("/")})`)