// Run with Vite running: node dev/scripts/arte-generation-smoke.mjs
// AI responses are mocked; no paid generation or publishing.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
 const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
 await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'local@example.test', loginAt: Date.now(), isOwner: true })))
 const page = await context.newPage()
 const errors = []
 page.on('pageerror', e => errors.push(e.message))
 let mode = 'direct'
 await page.route('**/api/ai?*', async route => {
  const req = route.request().postDataJSON()
  assert.ok(req.system.includes('Catálogo completo: 49 modelos'))
  assert.ok(req.system.includes('62-cartao'))
  assert.ok(req.system.includes('"id":"l1"'))
  const slides = mode === 'invalid' ? [{ template: 'cartao', cartao: 'inexistente' }] : mode === 'import' ? [{ template: 'cartao', cartao: '79-planilha', textos: { l2: 'Título alterado', l3: 'Corpo alterado', l1: 'extra' } }] : [
   { template: 'cartao', cartao: '62-cartao', textos: { l1: 'Planeje', l2: 'com calma' } },
   { template: 'cartao', cartao: '26-cachorro', textos: { balao: 'Faça uma pausa', legenda: 'Hoje' } },
   { template: 'cartao', cartao: '82-quinta', textos: { l2: 'tempo', l3: 'para respirar' } },
   { template: 'corCheia', titulo: 'Fechamento', texto: 'Uma coisa de cada vez.' },
  ]
  await route.fulfill({ json: { content: [{ type: 'text', text: JSON.stringify({ formato: 'feed', slides }) }] } })
 })
 await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}/arte`)
 await page.getByText('Criar com IA · descrever uma nova arte', { exact: true }).click()
 await page.getByLabel('Descreva a arte').fill('Quatro slides com modelos diferentes da galeria')
 await page.getByRole('button', { name: 'Criar arte', exact: true }).click()
 await page.getByRole('button', { name: /Baixar todos \(4\)/ }).waitFor({ timeout: 60000 })
 const canvas = page.locator('[data-canvas="editor"]')
 assert.ok((await canvas.textContent()).includes('Planeje'))
 assert.ok((await canvas.textContent()).includes('com calma'))
 assert.ok(!(await canvas.textContent()).includes('SEM'))
 assert.match(await page.getByRole('button', { name: /Baixar todos/ }).innerText(), /\(4\)/)
 for (const [i, label] of [[1, 'Faça uma pausa'], [2, 'tempo']]) {
  await page.locator('button:visible').filter({ has: page.locator('[data-canvas="miniatura"]') }).nth(i).click()
  assert.ok((await canvas.textContent()).includes(label))
 }
 const download = page.waitForEvent('download')
 await page.getByRole('button', { name: 'Baixar este', exact: true }).click()
 await page.getByRole('button', { name: 'Conferi os avisos · baixar', exact: true }).click()
 assert.equal(await (await download).failure(), null)
 const antesDoErro = await canvas.textContent()
 mode = 'invalid'
 await page.getByRole('button', { name: 'Criar arte', exact: true }).click()
 await page.getByText('A IA escolheu um modelo de arte que não existe. Tente gerar novamente.').waitFor()
 assert.equal(await canvas.textContent(), antesDoErro)
 mode = 'import'
 await page.evaluate(() => localStorage.setItem('studio-arte:entrada', JSON.stringify({ origem: 'Carrossel Studio', em: Date.now(), slides: [{ titulo: 'Título original', texto: 'Corpo original.' }] })))
 await page.reload()
 await page.waitForFunction(() => document.querySelector('[data-canvas="editor"]')?.textContent.includes('Título original'), null, { timeout: 60000 })
 const importado = await canvas.textContent()
 assert.ok(importado.includes('Título original'))
 assert.ok(importado.includes('Corpo original.'))
 assert.ok(!importado.includes('extra'))
 assert.deepEqual(errors, [])
 console.log('49-model prompt, generated collection and base slides, PNG, invalid response preservation and imported text fidelity passed')
 await context.close()
} finally { await browser.close() }
