// Roda os smoke tests de navegador do Studio de Arte e da tela de DM contra o Vite.
//
//   npm run smoke                      todos
//   npm run smoke -- arte-studio dm    só os que contêm esses nomes
//
// Sobe o Vite sozinho (porta 5173) se nada estiver respondendo; se já houver servidor, reaproveita.
// Cada script tem uma nova tentativa: o navegador sob carga às vezes perde um clique, e um teste que
// falha uma vez e passa na segunda é registrado como instável, não como quebrado.
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'
const filtros = process.argv.slice(2)
const MINUTOS_POR_SCRIPT = 6

const scripts = readdirSync(aqui)
  .filter((f) => /^(arte-.+|dm-post-picker)-smoke\.mjs$/.test(f))
  .filter((f) => !filtros.length || filtros.some((n) => f.includes(n)))
  .sort()

if (!scripts.length) { console.error('Nenhum smoke test encontrado para:', filtros.join(', ')); process.exit(2) }

const responde = () => fetch(url).then((r) => r.ok, () => false)

async function esperarServidor(ms = 90_000) {
  const limite = Date.now() + ms
  while (Date.now() < limite) {
    if (await responde()) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function rodar(script) {
  return new Promise((resolve) => {
    const inicio = Date.now()
    const filho = spawn(process.execPath, [path.join(aqui, script)], { env: { ...process.env, STUDIO_TEST_URL: url }, stdio: ['ignore', 'pipe', 'pipe'] })
    let saida = ''
    filho.stdout.on('data', (d) => { saida += d })
    filho.stderr.on('data', (d) => { saida += d })
    const timer = setTimeout(() => { saida += `\nTempo esgotado (${MINUTOS_POR_SCRIPT} min).`; filho.kill('SIGKILL') }, MINUTOS_POR_SCRIPT * 60_000)
    filho.on('close', (codigo) => { clearTimeout(timer); resolve({ ok: codigo === 0, saida, segundos: Math.round((Date.now() - inicio) / 1000) }) })
  })
}

let vite = null
const encerrar = () => { if (vite && !vite.killed) { try { process.kill(-vite.pid, 'SIGTERM') } catch { vite.kill('SIGTERM') } } }
process.on('exit', encerrar)
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => { encerrar(); process.exit(130) })

if (!(await responde())) {
  console.log(`Subindo o Vite em ${url}…`)
  vite = spawn('npx', ['vite', '--port', '5173', '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore', detached: true })
  if (!(await esperarServidor())) { console.error('O Vite não respondeu em 90 s.'); process.exit(2) }
}

const resultado = []
for (const script of scripts) {
  let r = await rodar(script)
  let instavel = false
  if (!r.ok) {
    console.log(`  ${script} falhou; tentando de novo. Fim da saída da primeira tentativa:`)
    console.log(r.saida.split('\n').filter((l) => l.trim()).slice(-12).map((l) => `    | ${l}`).join('\n'))
    const segunda = await rodar(script)
    instavel = segunda.ok
    r = segunda.ok ? segunda : { ...segunda, saida: `${r.saida}\n--- nova tentativa ---\n${segunda.saida}` }
  }
  resultado.push({ script, ...r, instavel })
  console.log(`${r.ok ? (instavel ? 'INSTÁVEL' : 'ok      ') : 'FALHOU  '} ${script} (${r.segundos}s)`)
  if (!r.ok) console.log(r.saida.split('\n').slice(-25).join('\n'))
}

const falhas = resultado.filter((r) => !r.ok)
const instaveis = resultado.filter((r) => r.instavel)
console.log(`\n${resultado.length - falhas.length}/${resultado.length} passaram${instaveis.length ? `, ${instaveis.length} só na segunda tentativa (${instaveis.map((r) => r.script).join(', ')})` : ''}.`)
process.exit(falhas.length ? 1 : 0)
