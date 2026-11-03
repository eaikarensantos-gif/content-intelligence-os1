// Assinatura padrão: salva no perfil, volta preenchida depois de recarregar e se aplica nos cards.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'ass@example.test', loginAt: Date.now(), isOwner: true })))
  const page = await context.newPage()
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  const abrirVisaoGeral = async () => {
    await page.goto(`${base}/arte`)
    await page.locator('[data-canvas="editor"]').waitFor()
    await page.getByText('Visão geral · organizar, ajustar e baixar vários cards').click()
    await page.getByLabel('Aplicar assinatura').check()
  }
  const campo = () => page.getByLabel('Assinatura', { exact: true })

  // 1. Primeira vez: sem padrão, o campo vem vazio e não há botão de salvar até digitar
  await abrirVisaoGeral()
  assert.equal(await campo().inputValue(), '')
  assert.equal(await page.getByRole('button', { name: /assinatura padrão/ }).count(), 0)
  await campo().fill('@karensantosperfil')
  await page.getByRole('button', { name: 'Salvar como assinatura padrão' }).click()
  await page.getByText('Esta é a sua assinatura padrão.').waitFor()

  // 2. Recarregando, a assinatura volta preenchida e se aplica no card
  await abrirVisaoGeral()
  assert.equal(await campo().inputValue(), '@karensantosperfil')
  await page.getByText('Card 1', { exact: true }).click()
  await page.getByRole('button', { name: 'Aplicar em 1 card', exact: true }).click()
  assert.ok((await page.locator('[data-canvas="editor"]').innerText()).includes('@karensantosperfil'))

  // 3. Apagar o campo oferece remover o padrão
  await campo().fill('')
  await page.getByRole('button', { name: 'Remover a assinatura padrão' }).click()
  await abrirVisaoGeral()
  assert.equal(await campo().inputValue(), '')
  assert.deepEqual(erros, [])
  await context.close()
} finally {
  await browser.close()
}
console.log('Assinatura padrão: salvar, recarregar, aplicar e remover passed')
