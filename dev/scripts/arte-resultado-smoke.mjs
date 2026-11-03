// Arte ligada ao post: seletor, resultado ao vivo (API simulada) e tabela por modelo com a regra das 4 amostras.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
const POST_ID = '18146854624569957'
const LISTA = [{ id: POST_ID, legenda: 'Carrossel: como montar um site', tipo: 'Carrossel', miniatura: null, link: 'https://www.instagram.com/p/DfR4sOClnaX/', data: '2026-11-03T12:00:00+0000' }]
const METRICAS = [{ id: POST_ID, likes: 100, comments: 5, saves: 21, shares: 3, reach: 900, permalink: 'https://www.instagram.com/p/DfR4sOClnaX/' }]

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  await context.addInitScript(() => {
    localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'resultado@example.test', loginAt: Date.now(), isOwner: true }))
    localStorage.setItem('cio-ig-connection', JSON.stringify({ accessToken: 'tok', accounts: [], expiresAt: Date.now() + 30 * 864e5 }))
  })
  await context.route(url => url.pathname === '/api/ai', route => {
    const { action } = route.request().postDataJSON() ?? {}
    if (action === 'instagram-list-media') return route.fulfill({ json: { posts: LISTA } })
    if (action === 'instagram-fetch-posts') return route.fulfill({ json: { posts: METRICAS, insightsAvailable: true } })
    return route.fallback()
  })
  const page = await context.newPage()
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  await page.goto(`${base}/arte`)
  await page.locator('[data-canvas="editor"]').waitFor()
  await page.getByText('Pacote de publicação · legenda, texto alternativo e checklist').click()
  const secao = page.getByLabel('Resultado do post')

  // 1. Ligar a arte ao post pelo seletor
  await secao.getByRole('button', { name: 'Escolher da lista de publicações' }).click()
  await secao.getByRole('button', { name: /Carrossel de 03\/11\/2026/ }).click()
  await secao.getByText(/Ligada ao post de 03\/11\/2026/).waitFor()

  // 2. Resultado ao vivo
  await secao.getByRole('button', { name: 'Buscar resultado' }).click()
  const painel = secao.getByRole('status')
  await painel.getByText('0,21').waitFor()
  assert.ok((await painel.innerText()).includes('900'), 'mostra o alcance')
  assert.ok((await painel.innerText()).includes('meta 0,40'), 'mostra a meta')

  // 3. Salvar a versão e comparar por modelo: um post só não basta para decidir
  await page.getByRole('button', { name: 'Salvar arte / carrossel' }).click()
  await page.getByLabel('Nome da arte').fill('Terça com site')
  await page.getByRole('button', { name: 'Salvar versão', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Versão salva' }).waitFor()
  await page.getByRole('button', { name: 'Resultados por modelo' }).click()
  const linha = page.getByRole('row').filter({ hasText: 'Tarjas sobre foto' })
  await linha.waitFor()
  const texto = await linha.innerText()
  assert.ok(texto.includes('0,21'), `razão na tabela: ${texto}`)
  assert.ok(texto.includes('Poucos dados: 1 de 4'), `aviso de amostra: ${texto}`)

  // 4. Desligar do post limpa a ligação
  await secao.getByRole('button', { name: 'Desligar do post' }).click()
  await secao.getByRole('button', { name: 'Escolher da lista de publicações' }).waitFor()
  assert.deepEqual(erros, [])
  await context.close()
} finally {
  await browser.close()
}
console.log('Arte ligada ao post: seletor, resultado, tabela por modelo e aviso de amostra passed')
