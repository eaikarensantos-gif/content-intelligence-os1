// Tela de DM: histórico de execuções (coluna received_at) e seletor de publicações das regras.
// Com o Vite rodando: node dev/scripts/dm-post-picker-smoke.mjs  (Supabase e /api/ai simulados)
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
const POSTS = [
  { id: '18146854624569957', legenda: 'Carrossel: como montar um site', tipo: 'Carrossel', miniatura: null, link: 'https://www.instagram.com/p/DfR4sOClnaX/', data: '2026-11-03T12:00:00+0000' },
  { id: '18089755622309321', legenda: 'Dica rápida de organização', tipo: 'Reel', miniatura: null, link: null, data: '2026-10-30T12:00:00+0000' },
]

async function abrir(conexao) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  await context.addInitScript((c) => {
    localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'dm@example.test', loginAt: Date.now(), isOwner: true }))
    localStorage.setItem('supabase-url', 'https://studio-test.supabase.co')
    localStorage.setItem('supabase-key', 'test-anon-key')
    if (c) localStorage.setItem('cio-ig-connection', JSON.stringify(c))
  }, conexao)
  const pedidos = []
  await context.route('https://studio-test.supabase.co/**', route => {
    const url = route.request().url()
    pedidos.push(url)
    if (url.includes('/ig_events')) {
      // Como o Postgres: coluna inexistente vira erro 400.
      if (/created_at/.test(decodeURIComponent(url))) return route.fulfill({ status: 400, json: { message: 'column ig_events.created_at does not exist' } })
      return route.fulfill({ json: [{ id: 'e1', event_type: 'comment', status: 'skipped', received_at: '2026-11-03T15:57:04Z', processed_at: '2026-11-03T15:57:05Z' }] })
    }
    return route.fulfill({ json: [] })
  })
  await context.route('**/api/ai', route => {
    const corpo = route.request().postDataJSON()
    if (corpo.action === 'instagram-list-media') return route.fulfill({ json: { posts: POSTS } })
    return route.fulfill({ status: 404, json: { error: 'ação inesperada' } })
  })
  const page = await context.newPage()
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  await page.goto(`${base}/dm-automation`)
  await page.getByRole('heading', { name: 'Regras de Gatilho' }).waitFor()
  return { context, page, erros, pedidos }
}

async function novaRegraPorPost(page) {
  await page.getByRole('button', { name: /Nova regra/ }).click()
  await page.locator('select').nth(1).selectOption('any_comment_on_post')
}

const futuro = { accessToken: 'tok', accounts: [{ id: '1', username: 'karen' }], expiresAt: Date.now() + 30 * 864e5 }

// 1. Histórico carrega e não pede created_at
{
  const { context, page, erros, pedidos } = await abrir(futuro)
  await page.getByText(/Consulta em/).waitFor()
  assert.equal(await page.getByRole('alert').filter({ hasText: 'Não foi possível consultar o histórico' }).count(), 0)
  assert.ok(pedidos.some(u => u.includes('/ig_events') && decodeURIComponent(u).includes('received_at')), 'consulta usa received_at')
  assert.ok(!pedidos.some(u => u.includes('/ig_events') && decodeURIComponent(u).includes('created_at')), 'consulta não usa created_at')
  await page.getByText('Ver eventos').click()
  assert.ok(await page.getByText(/Comentário|comment/).first().isVisible())
  assert.deepEqual(erros, [])
  await context.close()
}

// 2. Seletor preenche o ID e destaca a escolha
{
  const { context, page, erros } = await abrir(futuro)
  await novaRegraPorPost(page)
  await page.getByRole('button', { name: 'Escolher da lista de publicações' }).click()
  const alvo = page.getByRole('button', { name: /Carrossel de 03\/11\/2026: Carrossel: como montar um site/ })
  await alvo.waitFor()
  assert.equal(await page.getByRole('button', { name: /Reel de 30\/10\/2026/ }).count(), 1)
  await alvo.click()
  assert.equal(await page.getByPlaceholder('Ex: 17895...').inputValue(), '18146854624569957')
  // reabrir mostra a publicação escolhida marcada
  await page.getByRole('button', { name: 'Escolher da lista de publicações' }).click()
  assert.equal(await page.getByRole('button', { name: /Carrossel de 03\/11\/2026/ }).getAttribute('aria-pressed'), 'true')
  assert.deepEqual(erros, [])
  await context.close()
}

// 3. Token expirado: avisa e aponta para Configurações, sem chamar a API
{
  const { context, page } = await abrir({ ...futuro, expiresAt: Date.now() - 864e5 })
  await novaRegraPorPost(page)
  await page.getByRole('button', { name: 'Escolher da lista de publicações' }).click()
  await page.getByRole('alert').filter({ hasText: 'token do Instagram expirou' }).waitFor()
  assert.ok(await page.getByRole('link', { name: 'Abrir Configurações' }).isVisible())
  await context.close()
}

// 4. Sem conexão no navegador
{
  const { context, page } = await abrir(null)
  await novaRegraPorPost(page)
  await page.getByRole('button', { name: 'Escolher da lista de publicações' }).click()
  await page.getByRole('alert').filter({ hasText: 'não está conectado' }).waitFor()
  await context.close()
}

await browser.close()
console.log('DM: histórico sem created_at, seletor de publicações, token expirado e sem conexão passed')
