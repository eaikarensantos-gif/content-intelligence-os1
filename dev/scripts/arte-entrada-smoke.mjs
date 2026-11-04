// Conteúdo que chega do Studio de Criação não apaga o que estava no editor: o anterior vira rascunho.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
const ENTRADA = { origem: 'Studio de Criação', slides: [{ titulo: 'Conteúdo novo do Criação', texto: 'texto que veio pronto', papel: 'capa' }], em: 0 }

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'entrada@example.test', loginAt: Date.now(), isOwner: true })))
  // A IA de diagramação fica fora do ar: o Studio cai no layout simples, com os textos como vieram.
  await context.route(url => url.pathname === '/api/ai', route => (route.request().url().includes('action=openai') ? route.fulfill({ status: 500, json: { error: 'fora do ar' } }) : route.fallback()))
  const page = await context.newPage()
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  page.on('dialog', d => d.accept())
  await page.goto(`${base}/arte`)
  await page.locator('[data-canvas="editor"]').waitFor()
  const painel = () => page.getByRole('region', { name: 'Meus projetos de arte' })

  // 1. Trabalho em andamento, ainda não guardado
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { if (d.querySelector(':scope > summary')?.textContent.includes('Adicionar texto')) d.open = true }))
  await page.getByLabel(/^Título/).fill('Trabalho em andamento')
  await page.waitForTimeout(600) // o rascunho automático do navegador grava logo depois da edição

  // 2. Chega conteúdo do Criação e a página abre o Studio
  await page.evaluate((e) => localStorage.setItem('studio-arte:entrada', JSON.stringify({ ...e, em: Date.now() })), ENTRADA)
  await page.goto(`${base}/arte`)
  await page.getByText(/foi guardado como rascunho "Trabalho em andamento · \d\d\/\d\d" em Artes salvas/).waitFor({ timeout: 60000 })
  await page.waitForFunction(() => document.querySelector('[data-canvas="editor"]')?.innerText.includes('Conteúdo novo do Criação'))

  // 3. O trabalho anterior está lá, como rascunho
  await painel().getByRole('button', { name: 'Artes salvas', exact: true }).click()
  await painel().getByRole('button', { name: 'Rascunhos (1)' }).waitFor()
  await painel().getByText('Trabalho em andamento').waitFor()

  // 4. E o conteúdo novo, ainda sem guardar, também não se perde ao voltar para o anterior
  await painel().getByRole('button', { name: 'Continuar editando' }).click()
  await page.getByText(/foi guardado como rascunho "Conteúdo novo do Criação · \d\d\/\d\d"/).waitFor()
  await page.waitForFunction(() => document.querySelector('[data-canvas="editor"]')?.innerText.includes('Trabalho em andamento'))
  await painel().getByRole('button', { name: 'Artes salvas', exact: true }).click()
  await painel().getByRole('button', { name: 'Rascunhos (2)' }).waitFor()
  assert.deepEqual(erros, [])
  await context.close()
} finally {
  await browser.close()
}
console.log('Entrada do Criação: o que estava no editor vira rascunho e nada se perde passed')
