// Run with Vite running. AI responses are mocked; geometry uses real browser fonts.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
 for (const width of [1280, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'local@example.test', loginAt: Date.now(), isOwner: true })))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  let excessivo = false
  await page.route('**/api/ai?*', route => route.fulfill({ json: { content: [{ type: 'text', text: JSON.stringify({ formato: 'feed', slides: excessivo ? [{ template: 'corCheia', titulo: 'Muito texto', texto: 'Texto extenso. '.repeat(600) + 'FIM' }] : [{ template: 'corCheia', titulo: 'Uma ideia', texto: 'Um passo por vez.' }, { template: 'corCheia', titulo: 'Outra ideia', texto: 'Teste com calma.' }] }) }] } }))
  await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}/arte`)
  const geometry = await page.evaluate(async () => {
   const { conferirTexto } = await import('/src/components/arte/avaliarLayouts.jsx')
   const root = document.createElement('div')
   root.style.cssText = 'position:fixed;left:-20000px;top:0;width:1080px;height:1350px'
   document.body.appendChild(root)
   const block = (left, top, text) => `<div data-elemento="${top}" style="position:absolute;left:${left}px;top:${top}px;font:40px Arial;white-space:nowrap">${text}</div>`
   root.innerHTML = block(30, 30, 'Texto normal')
   const good = conferirTexto(root)
   root.innerHTML = block(1060, 30, 'Texto cortado')
   const overflow = conferirTexto(root)
   root.innerHTML = block(30, 30, 'Texto sobreposto') + block(30, 32, 'Outro texto')
   const overlap = conferirTexto(root)
   root.innerHTML = '<div data-elemento="bloco" style="position:absolute;left:30px;top:30px;font:40px Arial"><span style="position:absolute">Primeiro</span><span style="position:absolute">Segundo</span></div>'
   const nested = conferirTexto(root)
   root.remove()
   return { good, overflow, overlap, nested }
  })
  assert.equal(geometry.good.cabe, true)
  assert.equal(geometry.overflow.cabe, false)
  assert.equal(geometry.overlap.cabe, false)
  assert.equal(geometry.nested.cabe, false)
  const repair = await page.evaluate(async () => {
   const { createElement: h } = (await import('/node_modules/.vite/deps/react.js')).default
   const { avaliarLayouts, conferirTexto } = await import('/src/components/arte/avaliarLayouts.jsx')
   const { TEMPLATES } = await import('/src/components/arte/Templates.jsx')
   const { normalizar } = await import('/src/components/arte/marca.js')
   const titulo = 'uma boa pergunta aponta para algo concreto'
   const texto = 'Escolha uma pergunta quando ela aponta um elemento concreto da entrega, informa o critério de avaliação e permite uma resposta observável.\n\n“O título explica o benefício para quem lê?” oferece mais direção do que “o que você achou?”'
   const source = normalizar({ template: 'caixa', titulo, texto, detalhe: 'elemento → critério → resposta' }, TEMPLATES.caixa.padrao)
   const render = a => h('div', { style: { width: 1080, height: 1350, position: 'relative', overflow: 'hidden' } }, h(TEMPLATES[a.template].Corpo, { a, Bloco: ({ id, largura, children }) => h('div', { 'data-elemento': id, style: { position: 'absolute', left: a.pos[id]?.x, top: a.pos[id]?.y, width: a.est?.[id]?.largura ?? largura } }, children) }))
   // Restrict to original through a hidden unused layer, to confirm the screenshot is rejected.
   const broken = await avaliarLayouts({ ...source, est: { unused: { oculto: true } } }, { formato: 'feed' }, render)
   // Force the adaptive path: more body than any fixed model accepts, still readable in flow.
   const dense = normalizar({ template: 'corCheia', titulo, texto: texto.repeat(3), detalhe: '' }, TEMPLATES.corCheia.padrao)
   const adjusted = await avaliarLayouts(dense, { formato: 'feed' }, render)
   const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default
   const { flushSync } = (await import('/node_modules/.vite/deps/react-dom.js')).default
   const host = document.createElement('div'); document.body.appendChild(host)
   const root = createRoot(host)
   const option = adjusted.opcoes[0]
   let valid = false
   if (option) { flushSync(() => root.render(render(option.slide))); valid = conferirTexto(host.firstElementChild).cabe }
   root.unmount(); host.remove()
   return { broken: broken.problemas, name: option?.nome, valid, preserved: option?.slide.texto === dense.texto }
  })
  assert.ok(repair.broken.includes('Blocos de texto se sobrepõem'))
  assert.equal(repair.name, 'Diagramação ajustada')
  assert.equal(repair.valid, true)
  assert.equal(repair.preserved, true)
  for (const [label, value] of [[/^Título/, 'Uma ideia'], [/^Texto/, 'Um passo por vez.']]) {
   await page.getByLabel('Elementos da arte').getByRole('button', { name: label }).click()
   await page.getByRole('combobox', { name: 'Fonte', exact: true }).locator('../..').locator('textarea').fill(value)
   await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  }
  const panel = page.getByRole('region', { name: 'Sugestões de layout' })
  await panel.getByRole('button', { name: 'Sugerir layouts', exact: true }).click()
  await panel.getByRole('button', { name: 'Reavaliar', exact: true }).waitFor({ timeout: 60000 })
  const count = await panel.locator('[data-layout-sugestao]').count()
  assert.equal(count, 3)
  assert.ok(await panel.getByText('Com foto de referência · substitua pela sua', { exact: true }).count() > 0)
  assert.equal(await panel.getByText('Texto conferido na prévia', { exact: false }).count(), 3)
  await panel.getByRole('button', { name: 'Usar este layout', exact: true }).nth(1).click()
  assert.ok((await page.locator('[data-canvas="editor"]').innerText()).includes('Uma ideia'))
  assert.ok((await page.locator('[data-canvas="editor"]').innerText()).includes('Um passo por vez.'))
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await panel.getByText('A arte mudou. Reavalie para conferir o conteúdo atual.').waitFor()
  assert.equal(await panel.locator('[data-layout-sugestao]').count(), 0)
  await page.getByLabel('Descreva a arte').fill('Crie dois slides sobre começar um projeto')
  await page.getByRole('button', { name: 'Criar arte', exact: true }).click()
  await page.getByRole('button', { name: /Baixar todos \(2\)/ }).waitFor({ timeout: 60000 })
  await panel.getByRole('button', { name: 'Reavaliar', exact: true }).waitFor()
  const applied = await page.locator('[data-canvas="editor"]').innerText()
  assert.ok(applied.includes('Uma ideia') && applied.includes('Um passo por vez.'))
  assert.deepEqual(errors, [])
  await panel.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `/tmp/layout-suggestions-${width}.png` })
  excessivo = true
  await page.getByRole('button', { name: 'Criar arte', exact: true }).click()
  await page.getByText(/Não foi possível diagramar o slide 1/).waitFor({ timeout: 60000 })
  assert.equal(await page.locator('[data-canvas="editor"]').innerText(), applied)
  assert.deepEqual(errors, [])
  console.log(`${width}px: measured overflow/overlap, three ranked previews, apply/undo, automatic generation and content preservation passed`)
  await context.close()
 }
} finally { await browser.close() }
