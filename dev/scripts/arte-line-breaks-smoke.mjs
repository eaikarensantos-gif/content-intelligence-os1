// Run with Vite running: node dev/scripts/arte-line-breaks-smoke.mjs
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']})
try {
for (const width of [1440,390]) {
 const context = await browser.newContext({viewport:{width,height:1000},acceptDownloads:true})
 await context.addInitScript(()=>localStorage.setItem('cio-auth-session',JSON.stringify({email:'local@example.test',loginAt:Date.now(),isOwner:true})))
 const page=await context.newPage()
 await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}/arte`)
 await page.locator('[data-canvas="editor"]').waitFor()
 await page.getByRole('button',{name:/Modelos de arte/}).click()
 await page.getByPlaceholder('Buscar por nome, categoria ou texto').fill('Balão e polaroid com pet')
 await page.locator('[data-modelo="cartao:26-cachorro"]').click()
 await page.getByRole('button',{name:'Usar neste slide',exact:true}).click()
 const field=page.locator('textarea[data-campo="balao"]')
 await field.fill('PrimeiraSegunda')
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
