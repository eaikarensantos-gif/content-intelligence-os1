import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
 for (const width of [1280, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: true })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'local@example.test', loginAt: Date.now(), isOwner: true })))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5173/arte')
  await page.getByRole('button', { name: 'Nova arte', exact: true }).waitFor()
  for (const collection of [false, true]) {
   await page.evaluate(async collection => {
    const { salvarRascunho } = await import('/src/components/arte/armazem.js')
    const { TEMPLATES } = await import('/src/components/arte/Templates.jsx')
    const { novoCartao } = await import('/src/components/arte/cartoes/render.js')
    const slide = collection ? novoCartao('62-cartao', { textos: { l1: 'Minha primeira frase', l2: '', l3: '', s1: '', s2: '', s3: '', s4: '' } }) : { ...TEMPLATES.corCheia.padrao, template: 'corCheia', titulo: 'Minha primeira frase', texto: '', detalhe: '', emojis: [] }
    await salvarRascunho({ formato: 'feed', contador: false, atual: 0, slides: [slide] })
   }, collection)
   await page.reload()
   const canvas = page.locator('[data-canvas="editor"]')
   const text = canvas.getByText('Minha primeira frase', { exact: true })
   await text.waitFor()
   if (width === 390) {
    await text.tap()
    await text.tap()
   } else await text.dblclick()
   const editor = page.getByRole('textbox', { name: 'Editar texto na arte', exact: true })
   await editor.waitFor()
   assert.equal(await editor.inputValue(), 'Minha primeira frase')
   await editor.evaluate(el => el.setSelectionRange(5, 5))
   await editor.press('Enter')
   assert.equal(await editor.inputValue(), 'Minha\n primeira frase')
   await editor.press('Control+Enter')
   await editor.waitFor({ state: 'detached' })
   assert.match(await canvas.innerText(), /Minha\n\s*primeira frase/)
   await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
   assert.ok((await canvas.innerText()).includes('Minha primeira frase'))
   await canvas.getByText('Minha primeira frase', { exact: true }).dblclick()
   await editor.fill('Cancelado')
   await editor.press('Escape')
   assert.ok((await canvas.innerText()).includes('Minha primeira frase'))
   assert.equal(await page.getByRole('button', { name: 'Quebrar linha', exact: true }).count(), 0)
   await canvas.scrollIntoViewIfNeeded()
   await page.screenshot({ path: `/tmp/arte-ui-${width}-${collection}.png`, fullPage: true })
  }
  assert.deepEqual(errors, [])
  console.log(`${width}px: native and collection inline Enter, commit, undo and cancel passed`)
  await context.close()
 }
} finally { await browser.close() }
