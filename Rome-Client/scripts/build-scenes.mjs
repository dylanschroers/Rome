// Renders the source art in art/ into the images the app loads.
// Run it with `npm run build:art` whenever the art changes.
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { door, flame, gatePassage, gateWall } from '../art/scenes.mjs'

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
  { file: 'gate-passage.webp', art: gatePassage(SCENE_SIZE), options: { quality: 76 } },
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

if (overLimit) {
  console.error(`At least one image is over the ${SIZE_LIMIT_KB} KB limit.`)
  process.exitCode = 1
}
