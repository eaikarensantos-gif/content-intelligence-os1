import { build } from 'esbuild'
import { mkdir, copyFile } from 'node:fs/promises'
await mkdir('public/figma-carousel-plugin', { recursive: true })
await build({ entryPoints: ['figma-plugin/main.js'], bundle: true, outfile: 'public/figma-carousel-plugin/code.js', format: 'iife', target: 'es2017' })
for (const name of ['manifest.json', 'ui.html']) await copyFile(`figma-plugin/${name}`, `public/figma-carousel-plugin/${name}`)
