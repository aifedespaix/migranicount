import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, '../src/assets/logo.svg')
const outDir = join(__dirname, '../public/icons')

mkdirSync(outDir, { recursive: true })

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
]

for (const t of targets) {
  await sharp(src).resize(t.size, t.size).png().toFile(join(outDir, t.name))
  console.log(`generated ${t.name}`)
}
