// Grade do Instagram no Studio de Arte: feed atual (API simulada, com uma miniatura que só dá para ler pelo servidor),
// prévia da arte em edição, nota de harmonia, sugestões do Content, fixados, fila de artes salvas e persistência.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })

const svg = (cor) => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${cor}"/></svg>`
const dataUrl = (cor) => `data:image/svg+xml;utf8,${encodeURIComponent(svg(cor))}`
const CREME = '#F4EFE7', AREIA = '#F1DFC4', MOSTARDA = '#E9C46A', TERRACOTA = '#A64B2A'
const HOST_DIFICIL = 'https://scontent-test.cdninstagram.com/p2.svg'
// Posição 1 (depois da arte em edição) é mostarda; a 3 é terracota e só se lê pelo servidor.
const cores = [MOSTARDA, CREME, TERRACOTA, AREIA, CREME, CREME, AREIA, CREME, CREME, AREIA, CREME, CREME]
const LISTA = cores.map((cor, i) => ({
  id: `p${i}`, legenda: `Post ${i}`, tipo: 'Imagem', link: `https://www.instagram.com/p/x${i}/`, data: `2026-10-${String(28 - i).padStart(2, '0')}T12:00:00+0000`,
  miniatura: i === 2 ? HOST_DIFICIL : dataUrl(cor),
}))

const RASCUNHO = { formato: 'feed', contador: false, atual: 0, slides: [{ template: 'corCheia', fundo: 'mostarda', corTitulo: 'tinta', corTexto: 'tinta', corDestaque: 'terracota', titulo: 'Uma ideia', texto: 'Um passo por vez.' }] }

async function abrir(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, hasTouch: width < 600 })
  await context.addInitScript(() => {
    localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'grade@example.test', loginAt: Date.now(), isOwner: true }))
    localStorage.setItem('cio-ig-connection', JSON.stringify({ accessToken: 'tok', accounts: [], expiresAt: Date.now() + 30 * 864e5 }))
  })
  const chamadas = { imagem: 0 }
  await context.route((url) => url.pathname === '/api/ai', (route) => {
    const { action } = route.request().postDataJSON() ?? {}
    if (action === 'instagram-list-media') return route.fulfill({ json: { posts: LISTA } })
    if (action === 'instagram-image') { chamadas.imagem++; return route.fulfill({ json: { dataUrl: dataUrl(TERRACOTA) } }) }
    return route.fallback()
  })
  // A CDN simulada não manda CORS: o canvas não consegue ler direto e o app cai no servidor.
  // O Playwright acrescenta CORS sozinho nas respostas simuladas, então a leitura (modo cors) é recusada à mão (ela leva o cabeçalho origin) e só a exibição passa.
  await context.route(HOST_DIFICIL, (route) => (route.request().headers().origin
    ? route.abort()
    : route.fulfill({ contentType: 'image/svg+xml', body: svg(TERRACOTA), headers: { 'cross-origin-resource-policy': 'cross-origin' } })))
  const page = await context.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(e.message))
  return { context, page, erros, chamadas }
}

const painelDe = (page) => page.locator('details[aria-label="Grade do Instagram"]')
const abrirPainel = async (page) => { await page.getByText('Grade do Instagram · ver o feed antes de postar').click() }
const ordemDosNovos = (page) => painelDe(page).locator('[data-origem="novo"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tile')))
const nota = async (page) => Number(await painelDe(page).locator('[data-nota]').getAttribute('data-nota'))
const fundoDoEditor = (page) => page.locator('[data-canvas="editor"]').evaluate((e) => getComputedStyle(e).backgroundColor)

try {
  const { context, page, erros, chamadas } = await abrir(browser, 1280)
  await page.goto(`${base}/arte`)
  await page.locator('[data-canvas="editor"]').waitFor()

  // O rascunho do editor passa a ser um card mostarda, que é o que mais pesa na grade.
  // Antes, espera o primeiro salvamento do próprio app, que senão sobrescreve o nosso.
  await page.waitForFunction(() => new Promise((ok) => {
    const req = indexedDB.open('studio-arte', 1)
    req.onsuccess = () => {
      const db = req.result
      const get = db.objectStoreNames.contains('rascunhos') ? db.transaction('rascunhos').objectStore('rascunhos').get('atual') : null
      if (!get) { db.close(); return ok(false) }
      get.onsuccess = () => { db.close(); ok(!!get.result) }
    }
  }))
  await page.evaluate((rascunho) => new Promise((ok, erro) => {
    const req = indexedDB.open('studio-arte', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('rascunhos')
    req.onerror = () => erro(req.error)
    req.onsuccess = () => {
      const tx = req.result.transaction('rascunhos', 'readwrite')
      tx.objectStore('rascunhos').put(rascunho, 'atual')
      tx.oncomplete = () => { req.result.close(); ok() }
      tx.onerror = () => erro(tx.error)
    }
  }), RASCUNHO)
  await page.reload()
  await page.locator('[data-canvas="editor"]').waitFor()
  assert.equal(await fundoDoEditor(page), 'rgb(233, 196, 106)', 'o editor abriu com o fundo mostarda')

  const painel = painelDe(page)
  await abrirPainel(page)

  // 1. Feed atual + prévia da arte em edição, no topo
  await painel.getByRole('button', { name: 'Carregar o feed atual' }).click()
  await painel.locator('[data-origem="publicado"]').nth(11).waitFor()
  await painel.locator('[data-tile="editor"] img').waitFor()
  assert.equal(await painel.locator('[data-origem="novo"]').count(), 1)
  const primeiro = await painel.locator('[data-tile]').first().getAttribute('data-tile')
  assert.equal(primeiro, 'editor', 'o post novo fica na primeira posição')

  // 2. Nota e problemas: arte mostarda encosta no post mostarda (ao lado) e no terracota lido pelo servidor (embaixo)
  await painel.getByRole('button', { name: 'Content: sugerir ajustes na grade' }).click()
  await painel.locator('[data-nota]').waitFor()
  assert.ok(chamadas.imagem >= 1, 'a miniatura sem CORS foi lida pelo servidor')
  const antes = await nota(page)
  assert.ok(antes < 100, `nota antes: ${antes}`)
  const problemas = await painel.getByLabel('O que pesa na nota').innerText()
  assert.match(problemas, /lado a lado \(linha 1, colunas 1 e 2\)/)
  assert.match(problemas, /um em cima do outro \(coluna 1, linhas 1 e 2\)/)

  // A leitura de cada imagem pode ser conferida na própria grade
  await painel.getByLabel(/Mostrar o que o Content leu/).check()
  assert.ok(await painel.locator('[data-leitura="forte"]').count() >= 2, 'os posts mostarda e terracota aparecem como fortes')
  assert.ok(await painel.locator('[data-leitura="normal"]').count() >= 5, 'os posts creme aparecem com barulho baixo')
  assert.match(await painel.locator('[data-leitura]').first().innerText(), /(baixo|médio|forte) \d+ · (foto|arte)/, 'o selo mostra barulho e tipo')
  await painel.getByLabel('Como ler os selos').waitFor()
  await painel.getByLabel(/Mostrar o que o Content leu/).uncheck()

  // 3. Troca de fundo sugerida para o post novo, aplicada ao card 1 do editor
  const sugestao = painel.getByLabel(/^Fundo de Arte em edição/)
  await sugestao.waitFor()
  assert.match(await sugestao.innerText(), /trocar o fundo de Mostarda para/)
  await sugestao.getByRole('button', { name: 'Aplicar no card 1' }).click()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-canvas="editor"]')).backgroundColor !== 'rgb(233, 196, 106)')
  await page.waitForFunction((anterior) => Number(document.querySelector('[data-nota]')?.getAttribute('data-nota')) > anterior, antes, { timeout: 30000 })
  const depois = await nota(page)
  assert.ok(depois > antes, `nota depois (${depois}) maior que antes (${antes})`)
  // Desfazer do editor volta o fundo
  await page.getByRole('button', { name: 'Desfazer' }).first().click()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-canvas="editor"]')).backgroundColor === 'rgb(233, 196, 106)')

  // 3b. Sugerir outro: versões da arte nova (fundo e layout) e outro post para a posição
  await painel.locator('[data-tile="editor"]').click()
  await painel.getByRole('button', { name: 'Sugerir outro' }).click()
  const versao = painel.locator('[data-versao^="Fundo"]').first()
  await versao.waitFor({ timeout: 90000 })
  assert.match(await versao.innerText(), /Nota \d+ para \d+/)
  await versao.getByRole('button', { name: 'Usar esta versão' }).click()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-canvas="editor"]')).backgroundColor !== 'rgb(233, 196, 106)')
  await page.getByRole('button', { name: 'Desfazer' }).first().click()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-canvas="editor"]')).backgroundColor === 'rgb(233, 196, 106)')
  // post já publicado: a troca só existe na simulação
  await painel.locator('[data-tile="p0"]').click()
  await painel.getByRole('button', { name: 'Sugerir outro' }).click()
  const troca = painel.locator('[data-troca]').first()
  await troca.waitFor({ timeout: 60000 })
  assert.match(await troca.innerText(), /Só simulação/)
  await troca.getByRole('button', { name: 'Simular troca' }).click()
  await painel.getByText(/Mostrando a troca de/).waitFor()
  await painel.getByRole('button', { name: 'Voltar à grade real' }).click()
  await painel.getByText(/Mostrando a troca de/).waitFor({ state: 'detached' })
  assert.equal(await painel.locator('[data-tile]').first().getAttribute('data-tile'), 'editor', 'a grade real voltou')

  // 4. Fixar um post publicado: vai para o topo, e o quarto fixado é recusado
  await painel.locator('[data-tile="p5"]').click()
  await painel.getByRole('button', { name: 'Fixar no topo' }).click()
  assert.equal(await painel.locator('[data-tile]').first().getAttribute('data-tile'), 'p5')
  assert.match(await painel.locator('[data-tile="p5"]').getAttribute('aria-label'), /fixado/)
  for (const id of ['p6', 'p7', 'p8']) {
    await painel.locator(`[data-tile="${id}"]`).click()
    await painel.getByRole('button', { name: 'Fixar no topo' }).click()
  }
  await painel.getByText('O Instagram deixa fixar até 3 posts').waitFor()
  assert.equal(await painel.getByRole('button', { name: 'Soltar do topo' }).count(), 0, 'o tile aberto é o do quarto post, ainda solto')
  await painel.locator('[data-tile="p5"]').click()
  await painel.getByRole('button', { name: 'Soltar do topo' }).click()
  await painel.locator('[data-tile="p6"]').click()
  await painel.getByRole('button', { name: 'Soltar do topo' }).click()
  await painel.locator('[data-tile="p7"]').click()
  await painel.getByRole('button', { name: 'Soltar do topo' }).click()

  // 5. Fila: salva a arte, adiciona à grade, move e confere a ordem de publicação
  await page.getByRole('button', { name: 'Salvar arte / carrossel' }).click()
  await page.getByLabel('Nome da arte').fill('Arte da grade')
  await page.getByRole('button', { name: 'Salvar versão', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Versão salva' }).waitFor()
  await painel.getByRole('button', { name: 'Adicionar arte salva' }).click()
  await painel.getByLabel('Artes salvas').getByRole('button', { name: 'Adicionar à grade' }).first().click()
  await painel.locator('[data-origem="novo"]').nth(1).waitFor()
  let novos = await ordemDosNovos(page)
  assert.equal(novos.length, 2)
  assert.ok(novos[0].startsWith('fila:') && novos[1] === 'editor', `a arte adicionada entra na frente: ${novos}`)
  await painel.locator(`[data-tile="${novos[0]}"]`).click()
  await painel.getByRole('button', { name: 'Mover para depois' }).click()
  assert.deepEqual(await ordemDosNovos(page), ['editor', novos[0]])
  const publicar = await painel.getByLabel('Ordem para publicar').innerText()
  assert.ok(publicar.indexOf('Arte da grade') < publicar.indexOf('Arte em edição'), `ordem para publicar: ${publicar}`)

  // 6. A fila sobrevive à recarga
  await page.reload()
  await page.locator('[data-canvas="editor"]').waitFor()
  await abrirPainel(page)
  await painel.locator('[data-origem="novo"]').nth(1).waitFor()
  assert.deepEqual((await ordemDosNovos(page)).map((id) => (id === 'editor' ? id : 'fila')), ['editor', 'fila'])
  assert.deepEqual(erros, [])
  await context.close()

  // 7. Celular: sem rolagem horizontal
  const m = await abrir(browser, 390)
  await m.page.goto(`${base}/arte`)
  await m.page.locator('[data-canvas="editor"]').waitFor()
  await abrirPainel(m.page)
  await painelDe(m.page).getByRole('button', { name: 'Carregar o feed atual' }).click()
  await painelDe(m.page).locator('[data-origem="publicado"]').nth(11).waitFor()
  await painelDe(m.page).getByRole('button', { name: 'Content: sugerir ajustes na grade' }).click()
  await painelDe(m.page).locator('[data-nota]').waitFor()
  const sobra = await m.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(sobra <= 1, `sem rolagem horizontal no celular (sobra ${sobra}px)`)
  assert.deepEqual(m.erros, [])
  await m.context.close()
} finally {
  await browser.close()
}
console.log('Grade do Instagram: feed, leitura pelo servidor, nota, sugestões, fixados, fila e celular passed')
