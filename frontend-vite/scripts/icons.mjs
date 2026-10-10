// Every app icon from one picture (assets/app-icon.png): public/app-icon.png (in-app logo; then
// `pwa-assets-generator` makes favicon.ico, apple-touch-icon and the PWA PNGs from it), the maskable PWA
// icon, Android launcher icons (legacy, round, adaptive foreground) and splash screens.
// Run with `pnpm icons`. A larger source (1024 px) gives sharper big icons.
import { mkdirSync } from "node:fs"
import sharp from "sharp"

// dark of the artwork's own background: fills around the art wherever a launcher wants full bleed
const ART_BG = "#18181f"
const SPLASH_BG = "#0b0b0f"
const res = "android/app/src/main/res"

// the rounded icon without the transparent margin around it
const { data: framed, info } = await sharp("assets/app-icon.png").trim().toBuffer({ resolveWithObject: true })
// the artwork inside the rounded frame, for masks that draw their own shape
const inset = Math.round(Math.min(info.width, info.height) * 0.08)
const art = await sharp(framed)
  .extract({ left: inset, top: inset, width: info.width - 2 * inset, height: info.height - 2 * inset })
  .toBuffer()

const dir = (file) => mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true })
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

/** The framed icon, letterboxed into a square */
const framedPng = (size, file) => {
  dir(file)
  return sharp(framed).resize(size, size, { fit: "contain", background: transparent }).png().toFile(file)
}

/** The artwork filling a square, shrunk to `scale` of it on the artwork's dark, optionally cut to a circle */
async function artPng(size, file, { scale = 1, background = ART_BG, circle = false } = {}) {
  dir(file)
  const inner = Math.round(size * scale)
  const picture = await sharp(art).resize(inner, inner, { fit: "cover" }).png().toBuffer()
  let image = sharp({ create: { width: size, height: size, channels: 4, background } }).composite([
    { input: picture, gravity: "centre" }
  ])
  if (circle) {
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`)
    image = sharp(await image.png().toBuffer()).composite([{ input: mask, blend: "dest-in" }])
  }
  return image.png().toFile(file)
}

const jobs = [
  framedPng(512, "public/app-icon.png"),
  // maskable: full bleed, the face well inside the 80 % safe circle
  artPng(512, "public/maskable-icon-512x512.png", { scale: 0.74 })
]

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [name, k] of Object.entries(densities)) {
  jobs.push(framedPng(48 * k, `${res}/mipmap-${name}/ic_launcher.png`))
  jobs.push(artPng(48 * k, `${res}/mipmap-${name}/ic_launcher_round.png`, { circle: true }))
  // adaptive foreground: 108 dp canvas, launchers show the centre 66-72 dp
  jobs.push(artPng(108 * k, `${res}/mipmap-${name}/ic_launcher_foreground.png`, { scale: 0.64 }))
}

// splash: the icon in the middle of the app's dark background
async function splash(w, h, file) {
  dir(file)
  const size = Math.round(Math.min(w, h) * 0.34)
  const icon = await sharp(framed).resize(size, size, { fit: "contain", background: transparent }).png().toBuffer()
  return sharp({ create: { width: w, height: h, channels: 4, background: SPLASH_BG } })
    .composite([{ input: icon, gravity: "centre" }])
    .png()
    .toFile(file)
}
const portrait = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }
for (const [name, [w, h]] of Object.entries(portrait)) {
  jobs.push(splash(w, h, `${res}/drawable-port-${name}/splash.png`))
  jobs.push(splash(h, w, `${res}/drawable-land-${name}/splash.png`))
}
jobs.push(splash(480, 320, `${res}/drawable/splash.png`))

await Promise.all(jobs)
console.log(`icons: public/app-icon.png + maskable + ${jobs.length - 2} Android images`)
