// Run with Vite already running: node dev/scripts/social-studio-smoke.mjs
// All AI calls are intercepted. Nothing is posted and no real API key is used.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { defaultSocialOptions, socialSchema, SOCIAL_LABELS } from '../../src/utils/socialStudio.js'

const baseURL = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const observations = [
  'O caderno ficou aberto na mesa perto da janela.',
  'Eu escolhi o papel azul para marcar esta página.',
  'A caneta estava guardada junto do livro pequeno.',
  'Eu voltei ao trecho marcado durante a leitura.',
  'O livro continua aqui, com a página dobrada.',
]
function fixture(options) {
  const data = socialSchema(options)
  data.titulo = `Roteiro ${options.persona} ${options.format}`
  data.blocos = data.blocos.map((b, i) => options.format === 'linkedin'
    ? { ...b, titulo: options.presentation === 'documento' ? `Página ${i + 1}` : '', texto: observations[i] }
    : { ...b, fala: observations[i], texto_tela: `Caderno e livro ${i + 1}`, interacao: '' })
  data.legenda = ''
  data.pendencias = ['Confirmar o detalhe com a autora.']
  return data
}

try {
  for (const persona of ['trabalho', 'pessoal']) {
    const context = await browser.newContext({ viewport: persona === 'pessoal' ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] })
    await context.addInitScript(() => {
      localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'smoke@example.test', loginAt: Date.now(), isOwner: true }))
      localStorage.setItem('cio-openai-key', 'local-test-placeholder')
    })
    const page = await context.newPage()
    const errors = []; const requestErrors = []
    page.on('pageerror', e => errors.push(e.message))
    let options; let bad = false; let adapter = false; let calls = 0
    await context.route('**/api/ai**', async route => {
      calls++
      try {
        const body = route.request().postDataJSON()
        const prompt = body.messages[0].content
        let data
        if (adapter) {
          assert.ok(prompt.includes(persona === 'pessoal' ? 'STUDIO PESSOAL' : 'STUDIO PROFISSIONAL'))
          assert.ok(!prompt.includes('arraste pra cima'))
          data = { core_message: 'Uma cena com detalhes', versions: Object.fromEntries(['linkedin', 'reels', 'stories'].map(format => [format, fixture(defaultSocialOptions(format, persona))])) }
        } else {
          assert.ok(prompt.includes(`FORMATO: ${SOCIAL_LABELS[options.format]}`))
          assert.ok(prompt.includes(`TOM: ${options.tone}`))
          assert.ok(prompt.includes(persona === 'pessoal' ? 'STUDIO PESSOAL' : 'STUDIO PROFISSIONAL'))
          if (persona === 'pessoal') assert.ok(!body.system.includes('STUDIO PROFISSIONAL'))
          data = fixture(options)
          if (bad) data.blocos.pop()
        }
        await route.fulfill({ json: { content: [{ type: 'text', text: JSON.stringify(data) }] } })
      } catch (error) {
        requestErrors.push(error.message)
        await route.fulfill({ status: 500, json: { error: { message: 'Mock request failed' } } })
      }
    })
    const path = persona === 'pessoal' ? '/create-pessoal' : '/create'
    await page.goto(`${baseURL}${path}?submode=engagement`)
    for (const format of ['reels', 'stories', 'linkedin']) {
      await page.getByRole('button', { name: SOCIAL_LABELS[format], exact: true }).click()
      const section = page.getByRole('region', { name: `${SOCIAL_LABELS[format]} — ${persona === 'pessoal' ? 'Studio Pessoal' : 'Studio de Criação'}`, exact: true })
      options = { ...defaultSocialOptions(format, persona), topic: `Tema ${format}`, material: 'Meu caderno ficou na mesa. Eu escolhi papel azul para marcar o livro.' }
      await section.getByLabel(`Tema de ${SOCIAL_LABELS[format]}`, { exact: true }).fill(options.topic)
      await section.getByLabel('Material de apoio', { exact: true }).fill(options.material)
      if (format === 'reels') {
        options.duration = 30
        await section.getByLabel('Duração alvo', { exact: true }).selectOption('30')
      }
      await section.getByRole('button', { name: `Gerar ${SOCIAL_LABELS[format]}`, exact: true }).click()
      await section.getByTestId(`social-output-${format}`).waitFor()
      // Editing the form must not change the metadata of a previously generated result.
      await section.getByLabel(`Tema de ${SOCIAL_LABELS[format]}`, { exact: true }).fill('Outro tema ainda não gerado')
      await section.getByRole('button', { name: 'Salvar rascunho no Hub', exact: true }).click()
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('content-intelligence-os-v3')).state.ideas.at(-1))
      assert.equal(saved.editorial.topic, options.topic)
      assert.equal(saved.editorial.persona, persona)
      assert.equal(saved.status, 'draft')
      assert.ok(saved.script.includes('REVISÃO PENDENTE'))
      if (format === 'linkedin') {
        assert.equal(saved.format, 'post')
        await section.getByRole('button', { name: 'Copiar post', exact: true }).click()
        const copied = await page.evaluate(() => navigator.clipboard.readText())
        assert.ok(copied.includes(observations[0])); assert.ok(!copied.includes('REVISÃO PENDENTE'))
        options = { ...options, topic: 'Outro tema ainda não gerado', presentation: 'documento' }
        await section.getByLabel('Apresentação', { exact: true }).selectOption('documento')
        await section.getByRole('button', { name: 'Gerar LinkedIn', exact: true }).click()
        await section.getByRole('heading', { name: 'Página 5', exact: true }).waitFor()
        await section.getByRole('button', { name: 'Salvar rascunho no Hub', exact: true }).click()
        const document = await page.evaluate(() => JSON.parse(localStorage.getItem('content-intelligence-os-v3')).state.ideas.at(-1))
        assert.equal(document.format, 'carrossel'); assert.ok(document.script.includes('Visual:'))
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
        if (process.env.STUDIO_SCREENSHOT_DIR) await section.screenshot({ path: `${process.env.STUDIO_SCREENSHOT_DIR}/studio-${persona}.png` })
      }
    }
    // Switching tabs preserves generated scenes and the form.
    await page.getByRole('button', { name: 'Reels', exact: true }).click()
    await page.getByTestId('social-output-reels').waitFor()
    const reels = page.getByRole('region', { name: /^Reels —/ })
    await reels.getByLabel('Estrutura', { exact: true }).selectOption(persona === 'pessoal' ? 'historia' : 'caso')
    await reels.getByLabel('Material de apoio', { exact: true }).fill('')
    const before = calls
    await reels.getByRole('button', { name: 'Gerar Reels', exact: true }).click()
    await reels.getByRole('alert').filter({ hasText: 'fatos reais' }).waitFor()
    assert.equal(calls, before)
    options = { ...defaultSocialOptions('reels', persona), topic: 'Outro tema ainda não gerado', duration: 30, structure: persona === 'pessoal' ? 'historia' : 'caso', material: 'Eu escolhi o papel azul.' }
    await reels.getByLabel('Material de apoio', { exact: true }).fill(options.material)
    bad = true
    await reels.getByRole('button', { name: 'Gerar Reels', exact: true }).click()
    await reels.getByRole('alert').filter({ hasText: '5 blocos' }).waitFor()
    bad = false
    // Adapter shares the contracts and receives the Studio persona.
    adapter = true
    await page.getByRole('button', { name: /Adaptador Multi-plataforma/ }).click()
    await page.getByPlaceholder('Cole aqui seu artigo, roteiro, newsletter, entrevista ou qualquer texto que você queira adaptar para múltiplas plataformas...').fill('Meu caderno ficou na mesa durante a leitura. Eu escolhi papel azul para marcar o livro e voltei ao trecho que havia separado.')
    await page.getByRole('button', { name: 'Instagram', exact: true }).click()
    await page.getByRole('button', { name: 'Stories', exact: true }).click()
    await page.getByRole('button', { name: 'Transformar Texto', exact: true }).click()
    await page.locator('[data-testid="social-output-linkedin"]:visible').waitFor()
    await page.getByRole('button', { name: 'Salvar no Hub', exact: true }).click()
    const adapted = await page.evaluate(() => JSON.parse(localStorage.getItem('content-intelligence-os-v3')).state.ideas.at(-1))
    assert.equal(adapted.editorial.persona, persona); assert.equal(adapted.format, 'post')
    assert.ok(adapted.script.includes('REVISÃO PENDENTE'))
    for (const format of ['reels', 'stories']) {
      await page.getByRole('button', { name: SOCIAL_LABELS[format], exact: true }).last().click()
      await page.locator(`[data-testid="social-output-${format}"]:visible`).waitFor()
      await page.getByRole('button', { name: 'Salvar no Hub', exact: true }).click()
      const version = await page.evaluate(() => JSON.parse(localStorage.getItem('content-intelligence-os-v3')).state.ideas.at(-1))
      assert.equal(version.format, format === 'reels' ? 'reel' : 'story')
      assert.equal(version.editorial.persona, persona)
      assert.ok(version.script.includes('Mídia:'))
    }
    assert.deepEqual(errors, []); assert.deepEqual(requestErrors, [])
    console.log(`PASS ${persona}: Reels, Stories, LinkedIn text/document, saved snapshot, copying, tab preservation, missing facts, malformed response, adapter persona and persistence.`)
    await context.close()
  }
} finally { await browser.close() }
