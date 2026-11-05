// Renders the source art in art/ into the images the app loads.
// Run it with `npm run build:art` whenever the art changes.
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { door, flame, gateWall } from '../art/scenes.mjs'
import { forumScene, marketScene } from '../art/streets.mjs'
import { PLANES } from '../src/city/geometry.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src', 'assets', 'scenes')
const SCENE_SIZE = { outputWidth: 1920, outputHeight: 1080 }
const SIZE_LIMIT_KB = 300
const CUTOUT_OPTIONS = { quality: 74, alphaQuality: 100 }

const exportsToBuild = [
  { file: 'gate-wall.webp', art: gateWall(SCENE_SIZE), options: CUTOUT_OPTIONS },
  { file: 'door-left.webp', art: door({ outputWidth: 320, outputHeight: 1060 }), options: { quality: 78 } },
  { file: 'door-right.webp', art: door({ outputWidth: 320, outputHeight: 1060 }), options: { quality: 78 }, mirror: true },
  { file: 'flame.webp', art: flame({ outputWidth: 300, outputHeight: 340 }), options: { quality: 82, alphaQuality: 90 } },
  { file: 'forum.webp', art: forumScene(), options: CUTOUT_OPTIONS },
  { file: 'market.webp', art: marketScene(), options: { quality: 74 } },
]

await mkdir(outDir, { recursive: true })

let overLimit = false

async function report(file) {
  const { size } = await stat(join(outDir, file))
  const sizeKb = Math.round(size / 1024)
  overLimit ||= sizeKb > SIZE_LIMIT_KB
  console.log(`${file.padEnd(24)} ${String(sizeKb).padStart(4)} KB`)
}

for (const { file, art, options, mirror } of exportsToBuild) {
  let image = sharp(Buffer.from(art))
  if (mirror) image = image.flop()
  await image.webp({ effort: 6, ...options }).toFile(join(outDir, file))
  await report(file)
}

// The town seen through the gate is the Forum with the next scene showing
// through its opening, baked into one image so the gate moves as little as possible.
const PIXELS_PER_UNIT = 1920 / 1600
const sceneArt = { forum: forumScene(), market: marketScene() }
const layers = []

for (const plane of [...PLANES].reverse()) {
  const scale = 1 / (1 + plane.depth)
  const width = Math.round(1920 * scale * plane.size)
  const height = Math.round(1080 * scale * plane.size)
  const input = await sharp(Buffer.from(sceneArt[plane.id])).resize(width, height).png().toBuffer()
  const left = Math.round(960 + plane.x * scale * PIXELS_PER_UNIT - width / 2)
  const top = Math.round(540 + plane.y * scale * PIXELS_PER_UNIT - height / 2)

  if (top + height < 1080) {
    const ground = await sharp({
      create: { width, height: 1080 - (top + height), channels: 3, background: plane.ground },
    }).png().toBuffer()
    layers.push({ input: ground, left, top: top + height })
  }
  layers.push({ input, left, top })
}

await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#131726' } })
  .composite(layers)
  .webp({ effort: 6, quality: 76 })
  .toFile(join(outDir, 'town.webp'))
await report('town.webp')

if (overLimit) {
  console.error(`At least one image is over the ${SIZE_LIMIT_KB} KB limit.`)
  process.exitCode = 1
}
