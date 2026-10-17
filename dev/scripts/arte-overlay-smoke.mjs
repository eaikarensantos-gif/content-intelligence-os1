// Run with Vite running: node dev/scripts/arte-overlay-smoke.mjs
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: true, acceptDownloads: true })
    await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'local@example.test', loginAt: Date.now(), isOwner: true })))
    const page = await context.newPage()
    page.on('dialog', dialog => dialog.accept())
    await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}/arte`)
    for (const id of ['79-planilha', '80-aula', '81-rabisco', '82-quinta']) {
      await page.getByRole('button', { name: /^Modelos de arte/ }).click()
      await page.getByPlaceholder('Buscar por nome, categoria ou texto').fill('Atrás da cabeça')
      await page.locator(`[data-modelo="cartao:${id}"]`).click()
      await page.getByRole('button', { name: 'Usar neste slide', exact: true }).click()
      const editor = page.locator('[data-canvas="editor"] .kc')
      const order = () => editor.evaluate(root => [...root.children].map(el => Number(getComputedStyle(el).zIndex)))
      for (const [label, index] of [['Linha de cima', 2], ['Palavra gigante (sem p, g, q, j, y)', 3], ['Tarjas de baixo', 5], ['Nota manuscrita', 6]]) {
        const select = page.getByRole('combobox', { name: `${label}: sobreposição`, exact: true })
        await select.selectOption('atras')
        let z = await order()
        assert.ok(z[0] < z[index] && z[index] < z[4], `${id} ${label} behind person, above background`)
        await select.selectOption('frente')
        z = await order()
        assert.ok(z[index] > z[4], `${id} ${label} in front of person`)
        await select.selectOption('')
        z = await order()
        assert.equal(z[index], index * 10)
      }
      const select = page.getByRole('combobox', { name: 'Tarjas de baixo: sobreposição', exact: true })
      await select.selectOption('atras')
      // Select text even when the full-size cutout covers it.
      await select.locator('..').getByRole('button', { name: 'Selecionar este texto na arte' }).tap()
      await page.getByTestId('painel-camada').waitFor()
      assert.equal(await select.inputValue(), 'atras')
      await page.waitForTimeout(300)
      await page.reload()
      assert.equal(await select.inputValue(), 'atras')
      assert.ok((await order())[5] < (await order())[4])
      if (id === '82-quinta') {
        const download = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Baixar este', exact: true }).click()
        assert.equal(await (await download).failure(), null)
      }
    }
    console.log(`${width}px: all four cutout models, text stacking, reset, selection, persistence and PNG passed`)
    await context.close()
  }
} finally {
  await browser.close()
}
