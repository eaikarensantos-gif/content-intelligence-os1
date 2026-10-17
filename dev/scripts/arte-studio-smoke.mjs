// Run with Vite running: node dev/scripts/arte-studio-smoke.mjs
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const baseURL = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const errors = []

async function range(page, name, value) {
  await page.getByRole('slider', { name }).evaluate((input, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(next))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}
async function draft(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('studio-arte', 1)
    request.onsuccess = () => {
      const db = request.result
      const get = db.transaction('rascunhos').objectStore('rascunhos').get('atual')
      get.onsuccess = () => { resolve(get.result); db.close() }
      get.onerror = () => reject(get.error)
    }
    request.onerror = () => reject(request.error)
  }))
}

try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, acceptDownloads: true })
    await context.addInitScript(() => {
      localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'local@example.test', loginAt: Date.now(), isOwner: true }))
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${baseURL}/arte`)
    const editor = page.locator('[data-canvas="editor"]')
    const elements = page.getByLabel('Elementos da arte')
    await editor.waitFor()
    // Every template must honor independent title, body and detail fonts.
    const templates = viewport.width > 1000 ? ['tarjas', 'atrasCabeca', 'cabecaCaixa', 'corCheia', 'caixa', 'selecao', 'chat', 'busca'] : ['tarjas']
    for (const template of templates) {
      console.log(`Checking ${viewport.width}px ${template}`)
      await page.getByRole('combobox', { name: 'Template', exact: true }).selectOption(template)
      for (const [id, name, font, css] of [['titulo', /^Título/, 'georgia', 'Georgia'], ['texto', /^Texto/, 'bootzy', 'KS Bootzy'], ['detalhe', /^Detalhe manuscrito/, 'arial', 'Arial']]) {
        await elements.getByRole('button', { name }).click()
        const panel = page.getByRole('combobox', { name: 'Fonte', exact: true }).locator('../..')
        await panel.locator('textarea').fill(`${id} editável`)
        await page.getByRole('combobox', { name: 'Fonte', exact: true }).selectOption(font)
        const actual = await editor.locator(`[data-elemento="${id}"] [style*="font-family"]`).evaluateAll(els => els.map(el => getComputedStyle(el).fontFamily))
        assert.ok(actual.some(font => font.includes(css)), `${template}.${id}: ${actual}`)
        await page.getByRole('button', { name: 'Fechar', exact: true }).click()
      }
      await elements.getByRole('button', { name: 'Apagar título', exact: true }).click()
      assert.equal(await editor.locator('[data-elemento="titulo"]').count(), 0)
      assert.equal(await editor.locator('[data-elemento="texto"]').count(), 1)
      await elements.getByRole('button', { name: 'Restaurar título', exact: true }).click()
      await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    }
    await page.getByRole('combobox', { name: 'Template', exact: true }).selectOption('tarjas')
    await elements.getByRole('button', { name: /^Título/ }).click()
    await page.keyboard.press('Delete')
    assert.equal(await editor.locator('[data-elemento="titulo"]').count(), 0)
    // Delete in an input must edit the text, not delete the element.
    await elements.getByRole('button', { name: /^Texto/ }).click()
    const text = page.getByRole('combobox', { name: 'Fonte', exact: true }).locator('../..').locator('textarea')
    await text.fill('Corpo')
    await text.press('Backspace')
    assert.equal(await editor.locator('[data-elemento="texto"]').count(), 1)
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await elements.getByRole('button', { name: 'Apagar emoji 1', exact: true }).click()
    assert.equal(await editor.locator('[data-elemento="emoji:0"]').count(), 0)
    // Use a local photo fixture without network or an AI request.
    const photo = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 600
      const ctx = c.getContext('2d'); ctx.fillStyle = '#ef4444'; ctx.fillRect(0, 0, 400, 600)
      return c.toDataURL('image/png').split(',')[1]
    })
    await page.locator('main input[type="file"][accept="image/*"]').first().setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') })
    await page.getByRole('heading', { name: 'Foto · tamanho, posição e corte' }).waitFor()
    await range(page, /^Tamanho da foto/, 55)
    await range(page, /^Mover para cima/, 300)
    await range(page, /^Cortar em cima/, 12)
    await range(page, /^Cortar à esquerda/, 8)
    const layer = editor.locator('[data-foto]').first()
    assert.equal(await layer.locator('div').evaluate(el => el.style.backgroundSize), '55%')
    assert.equal(await layer.locator('div').evaluate(el => el.style.transform), 'translate(0px, 300px)')
    assert.ok((await layer.evaluate(el => el.style.clipPath)).includes('12%'))
    // Dragging the image must translate it, including at the mobile canvas scale.
    await editor.scrollIntoViewIfNeeded()
    const rect = await editor.boundingBox()
    await page.mouse.move(rect.x + 30, rect.y + 30)
    await page.mouse.down()
    await page.mouse.move(rect.x + 45, rect.y + 65, { steps: 5 })
    await page.mouse.up()
    const moved = await draft(page)
    assert.ok(moved.slides[0].fotoDY > 300)
    await page.reload()
    await editor.waitFor()
    await page.getByRole('heading', { name: 'Foto · tamanho, posição e corte' }).waitFor()
    assert.equal(await editor.locator('[data-elemento="titulo"]').count(), 0)
    assert.equal(await layer.locator('div').evaluate(el => el.style.backgroundSize), '55%')
    assert.ok((await layer.evaluate(el => el.style.clipPath)).includes('8%'))
    // Duplicating retains the edits. Export must produce an actual 1080 × 1350 PNG.
    await page.getByRole('button', { name: 'Duplicar', exact: true }).click()
    assert.equal(await editor.locator('[data-elemento="titulo"]').count(), 0)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar este', exact: true }).click()
    const file = await download
    const stream = await file.createReadStream(); const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const png = Buffer.concat(chunks)
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), 1080)
    assert.equal(png.readUInt32BE(20), 1350)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    await context.close()
    console.log(`Arte Studio: fonts, deletion, crop, movement, persistence and PNG passed at ${viewport.width}px`)
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
