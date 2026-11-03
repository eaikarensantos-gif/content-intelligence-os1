// Baixar PDF: um arquivo carrossel.pdf com uma página por card, na proporção da arte.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, acceptDownloads: true })
    await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'pdf@example.test', loginAt: Date.now(), isOwner: true })))
    const page = await context.newPage()
    const erros = []
    page.on('pageerror', e => erros.push(e.message))
    await page.goto(`${base}/arte`)
    await page.locator('[data-canvas="editor"]').waitFor()
    await page.getByRole('button', { name: 'Novo card', exact: true }).click()
    await page.getByRole('button', { name: /Baixar todos \(2\)/ }).waitFor()

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click()
    // Com avisos na revisão o download espera a confirmação.
    const conferi = page.getByRole('button', { name: /Conferi os avisos/ })
    await Promise.race([download.catch(() => {}), conferi.waitFor({ timeout: 30000 }).then(() => conferi.click()).catch(() => {})])
    const arquivo = await download
    assert.equal(arquivo.suggestedFilename(), 'carrossel.pdf')
    assert.equal(await arquivo.failure(), null)

    const chunks = []
    for await (const parte of await arquivo.createReadStream()) chunks.push(parte)
    const bytes = Buffer.concat(chunks)
    assert.equal(bytes.subarray(0, 5).toString('latin1'), '%PDF-')
    const texto = bytes.toString('latin1')
    assert.equal((texto.match(/\/Type\s*\/Page(?!s)/g) || []).length, 2, 'uma página por card')
    const [, larg, alt] = texto.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/)
    assert.ok(Math.abs(Number(larg) / Number(alt) - 1080 / 1350) < 0.01, `proporção da página ${larg}x${alt}`)
    assert.deepEqual(erros, [])
    await context.close()
    console.log(`${width}px: PDF com 2 páginas, ${(bytes.length / 1024).toFixed(0)} KB`)
  }
} finally {
  await browser.close()
}
console.log('PDF do carrossel: download, páginas e proporção passed')
