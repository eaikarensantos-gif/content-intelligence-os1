// Pacote de publicação: legenda (IA simulada), texto alternativo, checklist e arquivos no ZIP.
import assert from 'node:assert/strict'
import { unzipSync, strFromU8 } from 'fflate'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
const LEGENDA_IA = 'Quantos prazos você aceitou sem dizer não?\n\n[SUA LEITURA]\n\nA conta leva 5 minutos e está nos slides.'

async function baixar(page, botao) {
  const download = page.waitForEvent('download')
  await botao.click()
  // Com avisos na revisão o download espera a confirmação.
  const conferi = page.getByRole('button', { name: /Conferi os avisos/ })
  await Promise.race([download.catch(() => {}), conferi.waitFor({ timeout: 30000 }).then(() => conferi.click()).catch(() => {})])
  const arquivo = await download
  const partes = []
  for await (const p of await arquivo.createReadStream()) partes.push(p)
  return unzipSync(new Uint8Array(Buffer.concat(partes)))
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 }, acceptDownloads: true })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'pacote@example.test', loginAt: Date.now(), isOwner: true })))
  const pedidos = []
  await context.route(url => url.pathname === '/api/ai', route => {
    // Outras partes do app também chamam /api/ai ao abrir; só o pedido de IA (action=openai) é da legenda.
    if (!route.request().url().includes('action=openai')) return route.fallback()
    pedidos.push(route.request().postDataJSON())
    return route.fulfill({ json: { content: [{ type: 'text', text: LEGENDA_IA }] } })
  })
  const page = await context.newPage()
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  await page.goto(`${base}/arte`)
  await page.locator('[data-canvas="editor"]').waitFor()
  await page.getByText('Pacote de publicação · legenda, texto alternativo e checklist').click()

  // 1. Legenda da IA: carrega as regras de voz, e o trecho entre colchetes vira alerta
  await page.getByLabel('Tipo de legenda').selectOption('terca')
  await page.getByRole('button', { name: 'Gerar legenda com IA' }).click()
  const legenda = page.getByLabel('Legenda', { exact: true })
  await page.waitForFunction(() => document.querySelector('#legenda-arte')?.value.includes('Quantos prazos'))
  assert.equal(pedidos.length, 1)
  assert.ok(pedidos[0].system.includes('[SUA LEITURA]') && pedidos[0].system.includes('Proibido'), 'o pedido leva estrutura de terça e regras de voz')
  assert.ok(pedidos[0].messages[0].content.includes('Card 1:'), 'o pedido leva o texto dos cards')
  await page.getByRole('alert').filter({ hasText: '[SUA LEITURA]' }).waitFor()
  await legenda.fill(LEGENDA_IA.replace('[SUA LEITURA]', 'A leitura é minha.'))
  assert.equal(await page.getByRole('alert').filter({ hasText: 'trechos para preencher' }).count(), 0)

  // 2. Texto alternativo e checklist
  await page.getByRole('button', { name: 'Preencher os vazios com sugestão' }).click()
  assert.ok((await page.locator('#alt-0').inputValue()).startsWith('Card 1 de 1'))
  await page.getByLabel(/^Função\./).check()
  await page.getByRole('heading', { name: 'Checklist antes de publicar (1 de 6)' }).waitFor()

  // 3. ZIP leva PNG, legenda e alt text
  const zip = await baixar(page, page.getByRole('button', { name: /Baixar todos \(1\)/ }))
  assert.deepEqual(Object.keys(zip).sort(), ['alt-text.txt', 'card-01.png', 'legenda.txt'])
  assert.ok(strFromU8(zip['legenda.txt']).includes('A leitura é minha.'))
  assert.ok(strFromU8(zip['alt-text.txt']).startsWith('card-01: Card 1 de 1'))

  // 4. Editar o texto alternativo depois da revisão não invalida a revisão
  await page.getByRole('button', { name: 'Revisar carrossel', exact: true }).click()
  await page.getByRole('heading', { name: 'Revisão antes de baixar' }).waitFor()
  await page.locator('#alt-0').fill('Card com a pergunta de contagem')
  assert.equal(await page.getByText('A arte mudou. Revise novamente antes de baixar.').count(), 0)
  const zip2 = await baixar(page, page.getByRole('button', { name: /Baixar arquivos revisados|Conferi os avisos/ }))
  assert.ok(strFromU8(zip2['alt-text.txt']).includes('Card com a pergunta de contagem'))
  assert.deepEqual(erros, [])
  await context.close()
} finally {
  await browser.close()
}
console.log('Pacote de publicação: legenda, alertas, alt text, checklist, ZIP e revisão estável passed')
