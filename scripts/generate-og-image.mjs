import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconPath = join(__dirname, '../public/icons/icon-512.png')
const outPath = join(__dirname, '../public/og-image.png')

// Create purple background (1200x630)
const background = await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 139, g: 92, b: 246, alpha: 1 },
  },
}).png().toBuffer()

// Resize icon to 300x300
const icon = await sharp(iconPath).resize(300, 300).png().toBuffer()

// Composite icon centered on background
// Center position: left: (1200 - 300) / 2 = 450, top: (630 - 300) / 2 = 165
await sharp(background)
  .composite([{ input: icon, left: 450, top: 165 }])
  .toFile(outPath)

console.log('generated og-image.png')
