import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { unzipSync } from 'fflate'
import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
const rows = []
try {
 for (const width of [1280, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, hasTouch: true, acceptDownloads: true })
  await context.addInitScript(() => {
   localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'art@example.test', loginAt: Date.now(), isOwner: true }))
   localStorage.setItem('supabase-url', 'https://studio-test.supabase.co')
   localStorage.setItem('supabase-key', 'test-anon-key')
  })
  await context.route('https://studio-test.supabase.co/**', route => {
   if (route.request().method() === 'POST') { rows.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: {} }) }
   return route.fulfill({ json: rows.map(r => ({ value: r.value })) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5173/arte')
  await page.getByRole('button', { name: 'Nova arte', exact: true }).waitFor()
  await page.evaluate(async () => {
   const { TEMPLATES } = await import('/src/components/arte/Templates.jsx')
   const { salvarRascunho } = await import('/src/components/arte/armazem.js')
   await salvarRascunho({ formato: 'feed', contador: false, atual: 0, slides: ['Primeiro', 'Segundo', 'Terceiro'].map(titulo => ({ ...TEMPLATES.corCheia.padrao, template: 'corCheia', titulo, texto: '', detalhe: '', fundo: 'tinta', corTitulo: 'creme', emojis: [] })) })
  })
  await page.reload()
  const library = page.getByRole('region', { name: 'Meus projetos de arte' })
  for (let v = 0; v < 2; v++) {
   await library.getByRole('button', { name: 'Salvar arte / carrossel' }).click()
   await library.getByLabel('Nome da arte').fill(`Projeto ${width}`)
   await library.getByRole('button', { name: v ? 'Salvar nova versão' : 'Salvar cópia', exact: true }).click()
   await library.getByText(/Versão salva no banco da conta/).waitFor()
  }
  const recentes = rows.slice(-2)
  assert.notEqual(recentes[0].key, recentes[1].key)
  assert.equal(recentes[0].value.projetoId, recentes[1].value.projetoId)
  await library.getByRole('button', { name: 'Artes salvas', exact: true }).click()
  await library.getByText(`Projeto ${width}`, { exact: true }).waitFor()
  await library.getByRole('button', { name: 'Fechar biblioteca' }).click()

  const overview = page.getByLabel('Visão geral do carrossel')
  await overview.locator('summary').first().click()
  await overview.getByRole('button', { name: 'Selecionar todos', exact: true }).click()
  await overview.getByLabel('Fonte em lote').selectOption('inter')
  await overview.getByLabel('Cor em lote').selectOption('areia')
  await overview.getByRole('checkbox', { name: 'Aplicar assinatura' }).check()
  await overview.getByRole('textbox', { name: 'Assinatura', exact: true }).fill('@perfil')
  await overview.getByRole('button', { name: 'Aplicar em 3 card(s)', exact: true }).click()
  const canvas = page.locator('[data-canvas="editor"]')
  assert.ok((await canvas.innerText()).includes('@perfil'))
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  assert.ok(!(await canvas.innerText()).includes('@perfil'))
  await overview.getByRole('button', { name: 'Mover card 1 para depois', exact: true }).click()
  assert.ok((await canvas.innerText()).includes('Primeiro'))
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await overview.getByRole('button', { name: 'Limpar seleção', exact: true }).click()
  await overview.getByRole('checkbox', { name: 'Card 1', exact: true }).check()
  await overview.getByRole('checkbox', { name: 'Card 3', exact: true }).check()
  const download = page.waitForEvent('download', { timeout: 60000 })
  await overview.getByRole('button', { name: 'Baixar selecionados em ZIP (2)', exact: true }).click()
  const file = await download
  assert.equal(file.suggestedFilename(), 'carrossel.zip')
  const entries = unzipSync(new Uint8Array(await readFile(await file.path())))
  assert.deepEqual(Object.keys(entries), ['card-01.png', 'card-03.png'])
  for (const bytes of Object.values(entries)) {
   const png = Buffer.from(bytes)
   assert.equal(png.readUInt32BE(16), 1080)
   assert.equal(png.readUInt32BE(20), 1350)
  }
  // Snap close to the canvas center; the displayed guide is outside the exported canvas.
  const title = canvas.locator('[data-elemento="titulo"]')
  await title.scrollIntoViewIfNeeded()
  const bounds = await title.boundingBox()
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 20, bounds.y + bounds.height / 2, { steps: 3 })
  await page.mouse.move(bounds.x + bounds.width / 2 + 2, bounds.y + bounds.height / 2, { steps: 3 })
  assert.equal(await title.evaluate(el => Math.round(parseFloat(el.style.left))), 110)
  await page.mouse.up()
  // Review after a manual edit must be invalidated, never reused as approval.
  await canvas.locator('[data-elemento="titulo"]').dblclick()
  const editor = page.getByRole('textbox', { name: 'Editar texto na arte', exact: true })
  await editor.fill('Texto alterado')
  await editor.press('Control+Enter')
  await page.getByText('A arte mudou. Revise novamente antes de baixar.', { exact: true }).waitFor()
  // Reliable geometry and contrast check on a deliberately bad slide.
  const issues = await page.evaluate(async () => {
   const { conferirAcabamento } = await import('/src/components/arte/exportacaoArte.jsx')
   const root = document.createElement('div')
   root.style.cssText = 'position:absolute;left:-20000px;width:1080px;height:1350px;background:white'
   root.innerHTML = '<div style="position:absolute;left:1070px;top:10px;font:20px Arial;color:#eee;white-space:nowrap">Texto cortado e pequeno</div>'
   document.body.appendChild(root)
   const result = conferirAcabamento(root); root.remove(); return result
  })
  assert.ok(issues.includes('Texto ultrapassa a borda da arte'))
  assert.ok(issues.includes('Fonte pequena para leitura no celular'))
  assert.ok(issues.includes('Contraste baixo entre texto e fundo'))
  const collectionStyle = await page.evaluate(async () => {
   const React = (await import('/node_modules/.vite/deps/react.js')).default
   const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default
   const { flushSync } = (await import('/node_modules/.vite/deps/react-dom.js')).default
   const { CartaoCorpo } = await import('/src/components/arte/cartoes/Cartao.jsx')
   const { novoCartao } = await import('/src/components/arte/cartoes/render.js')
   const { aplicarEmLote } = await import('/src/components/arte/ajustesProjeto.js')
   const source = novoCartao('62-cartao', { textos: { l1: 'Texto', l2: '', l3: '', s1: '', s2: '', s3: '', s4: '' } })
   const slide = aplicarEmLote({ slides: [source] }, [0], { cor: 'creme', fundo: 'terracota', fonte: 'inter' }).slides[0]
   const host = document.createElement('div'); host.style.position = 'fixed'; host.style.left = '-20000px'; document.body.appendChild(host)
   const root = createRoot(host)
   flushSync(() => root.render(React.createElement(CartaoCorpo, { arte: slide })))
   const text = [...host.querySelectorAll('.ab')].find(el => el.textContent === 'Texto')
   const result = { color: getComputedStyle(text).color, font: getComputedStyle(text).fontFamily, background: getComputedStyle(host.querySelector('.ft')).backgroundColor }
   root.unmount(); host.remove(); return result
  })
  assert.equal(collectionStyle.color, 'rgb(244, 239, 231)')
  assert.equal(collectionStyle.background, 'rgb(166, 75, 42)')
  assert.ok(collectionStyle.font.includes('Inter'))
  await context.unroute('https://studio-test.supabase.co/**')
  await context.route('https://studio-test.supabase.co/**', route => route.fulfill({ status: 503, json: { message: 'offline' } }))
  await library.getByRole('button', { name: 'Salvar arte / carrossel' }).click()
  await library.getByRole('button', { name: 'Salvar nova versão', exact: true }).click()
  await library.getByText(/Versão salva somente neste navegador/).waitFor()
  assert.deepEqual(errors, [])
  await page.screenshot({ path: `/tmp/arte-complete-${width}.png` })
  console.log(`${width}px: cloud versions, batch/undo, order, selective ZIP PNG dimensions and stale review passed`)
  await context.close()
 }
 // A fresh device has no IndexedDB but can reopen the same saved project.
 const second = await browser.newContext()
 await second.addInitScript(() => {
  localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'art@example.test', loginAt: Date.now(), isOwner: true }))
  localStorage.setItem('supabase-url', 'https://studio-test.supabase.co')
  localStorage.setItem('supabase-key', 'test-anon-key')
 })
 await second.route('https://studio-test.supabase.co/**', route => route.fulfill({ json: rows.map(r => ({ value: r.value })) }))
 const page = await second.newPage()
 await page.goto('http://127.0.0.1:5173/arte')
 await page.getByRole('button', { name: 'Artes salvas', exact: true }).click()
 await page.getByText('Projeto 1280', { exact: true }).waitFor()
 await page.getByRole('button', { name: 'Abrir', exact: true }).first().click()
 assert.ok((await page.locator('[data-canvas="editor"]').innerText()).includes('Primeiro'))
 console.log('Fresh device reopened cloud project (mocked Supabase)')
 await second.close()
} finally { await browser.close() }
