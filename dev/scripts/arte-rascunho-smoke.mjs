// Rascunhos: guardar com um clique, começar outra arte sem perder nada, voltar depois e marcar como pronta.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { executablePath } from './_browser.mjs'

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  await context.addInitScript(() => localStorage.setItem('cio-auth-session', JSON.stringify({ email: 'rascunho@example.test', loginAt: Date.now(), isOwner: true })))
  const page = await context.newPage()
  const erros = []
  const dialogos = []
  page.on('pageerror', e => erros.push(e.message))
  page.on('dialog', async d => { dialogos.push(d.message()); await d.accept() })
  await page.goto(`${base}/arte`)
  const editor = page.locator('[data-canvas="editor"]')
  await editor.waitFor()
  const escrever = async (texto) => {
    // O bloco pode já estar aberto de antes: abre só se estiver fechado.
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { if (d.querySelector(':scope > summary')?.textContent.includes('Adicionar texto')) d.open = true }))
    await page.getByLabel(/^Título/).fill(texto)
  }
  const painel = () => page.getByRole('region', { name: 'Meus projetos de arte' })
  const abrirLista = async () => { await painel().getByRole('button', { name: 'Artes salvas', exact: true }).click() }

  // 1. Nada escrito ainda: não há o que guardar
  await painel().getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await painel().getByText('Ainda não há nada escrito para guardar').waitFor()

  // 2. Escreve e guarda com um clique, sem dar nome
  await escrever('Primeiro rascunho')
  await painel().getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await painel().getByText(/Rascunho "Primeiro rascunho · \d\d\/\d\d" guardado/).waitFor()
  await painel().getByText(/Arte atual: Primeiro rascunho · \d\d\/\d\d \(rascunho\)/).waitFor()

  // 3. Já guardado: começar outra arte não pergunta nada
  await painel().getByRole('button', { name: 'Nova arte', exact: true }).click()
  assert.equal(dialogos.length, 0, 'sem aviso quando o trabalho já está guardado')

  // 4. Escreve outra coisa e abre o rascunho: o que estava no editor vira rascunho antes de ser trocado
  await escrever('Segunda arte')
  await abrirLista()
  await painel().getByRole('button', { name: 'Rascunhos (1)' }).waitFor()
  await painel().getByRole('button', { name: 'Continuar editando' }).click()
  await page.getByText(/foi guardado como rascunho "Segunda arte · \d\d\/\d\d" em Artes salvas/).waitFor()
  await page.waitForFunction(() => document.querySelector('[data-canvas="editor"]')?.innerText.includes('Primeiro rascunho'))

  // 5. Os dois estão na lista, como rascunho; nenhum é "pronto" ainda
  await abrirLista()
  await painel().getByRole('button', { name: 'Rascunhos (2)' }).waitFor()
  await painel().getByRole('button', { name: 'Prontas (0)' }).click()
  await painel().getByText('Nenhuma arte neste filtro.').waitFor()

  // 6. Salvar como arte pronta tira da lista de rascunhos
  await painel().getByRole('button', { name: 'Rascunhos (2)' }).click()
  await painel().getByRole('button', { name: 'Fechar biblioteca' }).click()
  await painel().getByRole('button', { name: 'Salvar arte / carrossel' }).click()
  await painel().getByRole('button', { name: 'Salvar nova versão', exact: true }).click()
  await painel().getByText(/Versão salva/).waitFor()
  await abrirLista()
  await painel().getByRole('button', { name: 'Rascunhos (1)' }).waitFor()
  await painel().getByRole('button', { name: 'Prontas (1)' }).waitFor()
  assert.deepEqual(erros, [])
  await context.close()
} finally {
  await browser.close()
}
console.log('Rascunhos: guardar, trocar sem perder, voltar a editar e marcar como pronta passed')
