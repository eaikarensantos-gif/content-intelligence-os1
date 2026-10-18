// Run with Vite running: node dev/scripts/arte-line-breaks-smoke.mjs
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']})
try {
for (const width of [1440,1280,390]) {
 const context = await browser.newContext({viewport:{width,height:1000},hasTouch:width <= 1280,acceptDownloads:true})
 await context.addInitScript(()=>localStorage.setItem('cio-auth-session',JSON.stringify({email:'local@example.test',loginAt:Date.now(),isOwner:true})))
 const page=await context.newPage()
 page.on('dialog',dialog=>dialog.accept())
 await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}/arte`)
 await page.locator('[data-canvas="editor"]').waitFor()
 // Reproduce the selected title panel from the tablet screenshot.
 await page.getByLabel('Elementos da arte').getByRole('button',{name:/^Título/}).click()
 const title = page.getByRole('combobox',{name:'Fonte',exact:true}).locator('../..').locator('textarea')
 await title.fill('A pergunta define o tipo de resposta')
 assert.ok((await title.boundingBox()).height >= 96)
 await title.evaluate(el=>{el.focus();el.setSelectionRange(11,11)})
 const breakButton = title.locator('..').getByRole('button',{name:'Quebrar linha',exact:true})
 if (width <= 1280) await breakButton.tap()
 else await breakButton.click()
 assert.equal(await title.inputValue(),'A pergunta \ndefine o tipo de resposta')
 assert.ok((await page.locator('[data-canvas="editor"] [data-elemento="titulo"]').textContent()).includes('A pergunta \ndefine'))
 await page.getByRole('button',{name:'Fechar',exact:true}).click()
 await page.getByRole('button',{name:/Modelos de arte/}).click()
 const screenshotModel = width === 1280
 const fieldId = screenshotModel ? 'titulo' : 'balao'
 await page.getByPlaceholder('Buscar por nome, categoria ou texto').fill(screenshotModel ? 'Bastidores com campo de mensagem' : 'Balão e polaroid com pet')
 await page.locator(`[data-modelo="cartao:${screenshotModel ? '24-bastidores' : '26-cachorro'}"]`).click()
 await page.getByRole('button',{name:'Usar neste slide',exact:true}).click()
 const field=page.locator(`textarea[data-campo="${fieldId}"]`)
 await field.fill('PrimeiraSegunda')
 await page.locator('[data-canvas="editor"] .kc').getByText('PrimeiraSegunda',{exact:true}).click()
 await page.getByTestId('painel-camada').locator(`textarea[data-campo="${fieldId}"]`).waitFor()
 await field.evaluate(el=>{el.focus();el.setSelectionRange(8,8)})
 await field.locator('..').getByRole('button',{name:'Quebrar linha',exact:true}).click()
 assert.equal(await field.inputValue(),'Primeira\nSegunda')
 await field.press('Enter')
 assert.equal(await field.inputValue(),'Primeira\n\nSegunda')
 const text=page.locator('[data-canvas="editor"] .kc span').filter({hasText:'Primeira'}).first()
 assert.equal(await text.locator('br').count(),2)
 const positions=await text.evaluate(el=>{
 const nodes=[...el.childNodes].filter(n=>n.nodeType===3)
 return nodes.map(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect().y})
 })
 assert.ok(positions[1]>positions[0],`${width}: second line must be below first`)
 await page.waitForTimeout(800)
 await page.reload()
 assert.equal(await field.inputValue(),'Primeira\n\nSegunda')
 const downloaded=page.waitForEvent('download')
 await page.getByRole('button',{name:'Baixar este',exact:true}).click()
 const download=await downloaded
 assert.equal(await download.failure(),null)
 console.log(`${width}px: button, Enter, visual line positions, persistence and PNG passed`)
 await context.close()
}
} finally {await browser.close()}
