// Rascunho do Studio de Arte aparece na coluna Rascunhos do Hub de Ideias, e o link do card volta para o Studio.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'hub@example.test', loginAt: Date.now(), isOwner: true })))
  const page = await context.newPage()
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  page.on('dialog', d => d.accept())
  await page.goto(`${base}/arte`)
  await page.locator('[data-canvas="editor"]').waitFor()
  const painel = () => page.getByRole('region', { name: 'Meus projetos de arte' })

  // 1. Escreve, põe legenda e guarda como rascunho
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { if (d.querySelector(':scope > summary')?.textContent.includes('Adicionar texto')) d.open = true }))
  await page.getByLabel(/^Título/).fill('Rascunho para o Hub')
  await page.getByText('Pacote de publicação · legenda, texto alternativo e checklist').click()
  await page.getByLabel('Legenda', { exact: true }).fill('Legenda do rascunho.')
  await painel().getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await painel().getByText(/Rascunho "Rascunho para o Hub · \d\d\/\d\d" guardado/).waitFor()
  await painel().getByRole('button', { name: 'Nova arte', exact: true }).click()
  await page.waitForTimeout(600) // o editor limpo vai para o rascunho automático do navegador

  // 2. O Hub tem o card na coluna Rascunhos, com roteiro e legenda
  await page.goto(`${base}/ideas`)
  await page.getByRole('button', { name: /Quadro/ }).click()
  const card = page.getByText(/Rascunho para o Hub · \d\d\/\d\d/).first()
  await card.waitFor()
  await card.click()
  assert.ok((await page.getByPlaceholder('Escreva o roteiro completo do conteúdo aqui...').inputValue()).startsWith('Card 1\nRascunho para o Hub'))
  const link = page.getByRole('link', { name: 'Abrir no Studio de Arte' })
  await link.waitFor()
  assert.match(await link.getAttribute('href'), /^\/arte\?rascunho=.+/)

  // 3. O link leva de volta ao Studio, com o rascunho aberto para continuar
  await link.click()
  await page.waitForFunction(() => document.querySelector('[data-canvas="editor"]')?.innerText.includes('Rascunho para o Hub'), null, { timeout: 30000 })
  await painel().getByText(/Arte atual: Rascunho para o Hub · \d\d\/\d\d \(rascunho\)/).waitFor()
  assert.equal(new URL(page.url()).search, '', 'o endereço volta limpo')

  // 4. Salvar como pronta passa o card para Pronto e mantém um só card
  await painel().getByRole('button', { name: 'Salvar arte / carrossel' }).click()
  await painel().getByRole('button', { name: 'Salvar nova versão', exact: true }).click()
  await painel().getByText(/Versão salva/).waitFor()
  await page.goto(`${base}/ideas`)
  await page.getByRole('button', { name: /Quadro/ }).click()
  assert.equal(await page.getByText(/Rascunho para o Hub · \d\d\/\d\d/).count(), 1, 'um só card, atualizado')
  await page.getByText(/Rascunho para o Hub · \d\d\/\d\d/).first().click()
  const status = page.locator('select').filter({ has: page.locator('option[value="ready"]') }).first()
  assert.equal(await status.inputValue(), 'ready', 'o card passou para Pronto')
  assert.deepEqual(erros, [])
  await context.close()
} finally {
  await browser.close()
}
console.log('Hub: rascunho vira card, link volta ao Studio e salvar como pronta atualiza o mesmo card passed')
