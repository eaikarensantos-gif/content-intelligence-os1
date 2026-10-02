// Vite must be running. AI requests are mocked; no remote content is published.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { PLAN_CHANNELS } from '../../src/utils/multichannelPlan.js'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'], headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
await context.addInitScript(() => {
  localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'test@example.test', isOwner: true, loginAt: Date.now() }))
  localStorage.setItem('cio-openai-key', 'intercepted-test-placeholder')
})
const page = await context.newPage()
const errors = []; page.on('pageerror', e => errors.push(e.message))
let persona = 'trabalho', calls = 0, failOne = true, malformedPlan = false
await context.route('**/api/ai**', async route => {
  calls++
  const prompt = route.request().postDataJSON().messages[0].content
  try {
    const schema = JSON.parse(prompt.trim().split('\n').at(-1))
    if (schema.propostas) {
      schema.propostas = schema.propostas.map((card, i) => ({ ...card,
        publico: `Público do canal ${i}`, objetivo: `Objetivo do canal ${i}`, pergunta: `Pergunta específica sobre o canal ${i}`, recorte: `Recorte ${i}`, entrega: `Entrega ${i}`, justificativa: `Motivo específico ${i}`, evidencias: ['Trecho fornecido'], pendencias: i === 0 ? ['Confirmar período'] : [], ressalva: '',
      }))
      schema.propostas[1].pergunta = schema.propostas[0].pergunta
      if (malformedPlan) schema.propostas.pop()
    } else {
      if (prompt.includes('FORMATO: X · Post') && failOne) {
        failOne = false
        await route.fulfill({ status: 503, json: { error: { message: 'Temporary failure' } } }); return
      }
      schema.titulo = `Roteiro ${persona}`
      schema.blocos = schema.blocos.map((b, i) => ({ ...b,
        ...(b.fala !== undefined ? { fala: `Observe este detalhe do caderno número ${i + 1}.`, texto_tela: `Caderno ${i + 1}`, acao: 'Mostrar o caderno.', interacao: '' } : { texto: `O caderno está aberto na página ${i + 1}.` }),
      }))
      schema.legenda = ''; schema.pendencias = []
    }
    await route.fulfill({ json: { content: [{ type: 'text', text: JSON.stringify(schema) }] } })
  } catch (e) {
    errors.push(e.message)
    await route.fulfill({ status: 500, json: { error: { message: e.message } } })
  }
})
try {
  for (persona of ['trabalho', 'pessoal']) {
    failOne = true
    const route = persona === 'pessoal' ? '/create-pessoal' : '/create'
    await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}${route}?tool=multichannel`)
    const planner = page.getByRole('region', { name: 'Planejamento multicanal' })
    await planner.getByLabel('Assunto', { exact: true }).fill(`Tema ${persona}`)
    await planner.getByLabel('Fatos e materiais disponíveis', { exact: true }).fill('Meu caderno está aberto na mesa, com páginas numeradas.')
    await planner.getByLabel('LinkedIn · Documento', { exact: true }).check()
    await planner.getByLabel('X · Sequência', { exact: true }).check()
    const before = calls
    await planner.getByRole('button', { name: 'Planejar distribuição', exact: true }).click()
    await planner.getByText('Recortes que merecem diferenciação', { exact: true }).waitFor()
    assert.equal(calls, before + 1)
    assert.equal(await planner.getByRole('article').count(), 7)
    const carousel = planner.getByRole('article', { name: 'Instagram · Carrossel', exact: true })
    await carousel.getByLabel('Pergunta central', { exact: true }).fill('Quais critérios tornam uma comparação útil?')
    await carousel.getByLabel('Público', { exact: true }).fill('')
    await page.reload()
    await carousel.getByLabel('Público', { exact: true }).waitFor()
    assert.equal(await carousel.getByLabel('Público', { exact: true }).inputValue(), '')
    await carousel.getByLabel('Público', { exact: true }).fill('Leitores deste assunto')
    await planner.getByRole('button', { name: 'Gerar roteiros selecionados (7)', exact: true }).click()
    await planner.getByRole('button', { name: 'Gerar roteiros selecionados (7)', exact: true }).waitFor()
    const x = planner.getByRole('article', { name: 'X · Post', exact: true })
    await x.getByRole('alert').waitFor()
    const thread = planner.getByRole('article', { name: 'X · Sequência', exact: true })
    assert.equal(await thread.getByTestId('compact-script').count(), 1)
    await x.getByRole('button', { name: 'Gerar este roteiro', exact: true }).click()
    await x.getByTestId('compact-script').waitFor()
    for (const [id, { label }] of Object.entries(PLAN_CHANNELS)) {
      const card = planner.getByRole('article', { name: label, exact: true })
      if (id === 'instagram_carousel') assert.equal(await card.getByTestId('compact-script').locator('h4').count(), persona === 'pessoal' ? 7 : 8)
      await card.getByRole('button', { name: 'Salvar rascunho no Hub', exact: true }).click()
    }
    const ideas = await page.evaluate(() => JSON.parse(localStorage.getItem('content-intelligence-os-v3')).state.ideas)
    assert.equal(ideas.filter(i => i.distribution_plan?.persona === persona).length, 7)
    assert.equal(new Set(ideas.filter(i => i.distribution_plan?.persona === persona).map(i => i.distribution_plan.id)).size, 1)
    assert.ok(ideas.every(i => i.status === 'draft'))
    await x.getByLabel('Recorte', { exact: true }).fill('Uma perspectiva nova')
    await x.getByText('O recorte mudou depois da geração.', { exact: false }).waitFor()
    assert.ok(await x.getByRole('button', { name: 'Salvo no Hub', exact: true }).isDisabled())
    await page.reload()
    await x.getByTestId('compact-script').waitFor()
    assert.equal(await x.getByLabel('Recorte', { exact: true }).inputValue(), 'Uma perspectiva nova')
    malformedPlan = true
    await planner.getByRole('button', { name: 'Criar novo plano', exact: true }).click()
    await planner.getByRole('alert').filter({ hasText: 'cada canal' }).waitFor()
    assert.equal(await planner.getByRole('article').count(), 7)
    malformedPlan = false
    console.log(`PASS ${persona}: plan before scripts, duplicate warning, editable/unfinished draft restore, seven formats, partial failure retry, stale result guard, Hub metadata, failed replan preservation.`)
  }
  assert.deepEqual(errors, [])
  const stored = await page.evaluate(() => ['trabalho', 'pessoal'].map(p => JSON.parse(localStorage.getItem(`cio-multichannel-${p}-v1`)).plan.persona))
  assert.deepEqual(stored, ['trabalho', 'pessoal'])
} finally { await browser.close() }
