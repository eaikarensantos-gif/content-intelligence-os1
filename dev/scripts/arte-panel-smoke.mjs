// Run with Vite running: node dev/scripts/arte-panel-smoke.mjs
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
 for (const width of [1280, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'local@example.test', loginAt: Date.now(), isOwner: true })))
  const page = await context.newPage()
  await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}/arte`)
  if (width === 1280) {
   const missing = await page.evaluate(async () => {
    const { CARTOES } = await import('/src/components/arte/cartoes/colecao.js')
    const { camposDaCamada, htmlCartao, novoCartao } = await import('/src/components/arte/cartoes/render.js')
    return CARTOES.flatMap(def => {
     const arte = novoCartao(def.id)
     const template = document.createElement('template')
     template.innerHTML = htmlCartao(def, arte, { grao: false })
     const ids = new Set([...template.content.children].flatMap((_, i) => camposDaCamada(def, arte, i).map(c => c.id)))
     return def.campos.filter(c => !ids.has(c.id)).map(c => `${def.id}.${c.id}`)
    })
   })
   assert.deepEqual(missing, [], 'all collection fields must remain reachable through their layer')
  }
  await page.getByRole('button', { name: /^Modelos de arte/ }).click()
  await page.getByPlaceholder('Buscar por nome, categoria ou texto').fill('Cartão tipográfico')
  await page.locator('[data-modelo="cartao:62-cartao"]').click()
  await page.getByRole('button', { name: 'Usar neste slide', exact: true }).click()
  await page.locator('textarea[data-campo="l1"]').fill('Feedback vago consome tempo duas vezes')
  const canvas = page.locator('[data-canvas="editor"] .kc')
  await canvas.getByText('Feedback vago consome tempo duas vezes', { exact: true }).tap({ position: { x: 20, y: 20 } })
  const panel = page.getByTestId('painel-camada')
  assert.equal(await panel.locator('textarea:visible').count(), 1)
  assert.equal(await panel.locator('textarea:visible').getAttribute('data-campo'), 'l1')
  assert.ok((await panel.boundingBox()).height < 650)
  await panel.locator('textarea:visible').fill('Feedback\nvago')
  assert.equal(await panel.locator('textarea:visible').count(), 1)
  await panel.locator('textarea:visible').fill('')
  assert.equal(await panel.locator('textarea:visible').count(), 1, 'emptying the selected text must not close its editor')
  await panel.locator('textarea:visible').fill('Feedback\nvago')
  await panel.getByText(/Outros textos do modelo/).click()
  assert.ok(await panel.locator('textarea:visible').count() > 1)
  await panel.locator('textarea[data-campo="l2"]').fill('Segunda linha')
  await canvas.getByText('Segunda linha', { exact: true }).tap()
  assert.equal(await panel.locator('textarea:visible').count(), 1)
  assert.equal(await panel.locator('textarea:visible').getAttribute('data-campo'), 'l2')
  await panel.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `/tmp/arte-panel-${width}.png` })
  console.log(`${width}px: compact panel, correct field, line breaks, empty text, other fields and selection switching passed`)
  await context.close()
 }
} finally { await browser.close() }
