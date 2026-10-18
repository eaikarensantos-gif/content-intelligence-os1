import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'local@example.test', loginAt: Date.now(), isOwner: true })))
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('http://127.0.0.1:5173/arte')
    const projects = page.getByRole('region', { name: 'Meus projetos de arte' })
    const canvas = page.locator('[data-canvas="editor"]')
    await projects.getByRole('button', { name: 'Nova arte', exact: true }).waitFor()
    const original = await canvas.innerText()
    assert.ok(original.trim())
    await page.getByRole('button', { name: 'Duplicar', exact: true }).click()
    await projects.getByRole('button', { name: 'Salvar arte / carrossel' }).click()
    await projects.getByLabel('Nome da arte').fill('Meu carrossel favorito')
    await projects.getByRole('button', { name: 'Salvar cópia', exact: true }).click()
    await projects.getByText(/Versão salva somente neste navegador/).waitFor()
    await projects.getByRole('button', { name: 'Nova arte', exact: true }).click()
    assert.equal((await canvas.innerText()).trim(), '')
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    assert.equal(await canvas.innerText(), original)
    await page.getByRole('button', { name: 'Baixar todos (2)', exact: true }).waitFor()
    await projects.getByRole('button', { name: 'Apagar todos os cards', exact: true }).click()
    assert.equal((await canvas.innerText()).trim(), '')
    // Wait for the blank draft to commit before reloading.
    await page.waitForFunction(async () => {
      const { lerRascunho } = await import('/src/components/arte/armazem.js')
      const p = await lerRascunho()
      return p?.slides.length === 1 && p.slides[0].titulo === ''
    })
    await page.reload()
    await projects.getByRole('button', { name: 'Artes salvas', exact: true }).click()
    await projects.getByText('Meu carrossel favorito', { exact: true }).waitFor()
    await projects.getByRole('button', { name: 'Abrir', exact: true }).click()
    assert.equal(await canvas.innerText(), original)
    await page.getByRole('button', { name: 'Baixar todos (2)', exact: true }).waitFor()
    await projects.getByRole('button', { name: 'Salvar arte / carrossel' }).click()
    await projects.getByLabel('Nome da arte').fill('Falha de armazenamento')
    await page.evaluate(() => { indexedDB.open = () => { throw new Error('storage unavailable') } })
    await projects.getByRole('button', { name: 'Salvar nova versão', exact: true }).click()
    await projects.getByText(/Não foi possível salvar/).waitFor()
    assert.equal(await canvas.innerText(), original)
    assert.deepEqual(errors, [])
    console.log(`${width}px: save, clear, undo, reload, reopen and storage failure passed`)
    await context.close()
  }
} finally { await browser.close() }
