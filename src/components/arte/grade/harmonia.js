// Nota de harmonia da grade do Instagram e as buscas de ordem. Funções puras, sem React nem rede.
//
// A nota é editorial, não previsão de desempenho. Ela olha só o que dá para conferir na imagem:
//   1. dois posts de cor forte encostados (ao lado ou um em cima do outro);
//   2. mais da metade da janela em cor forte;
//   3. três posts escuros em sequência;
//   4. uma cor forte que não se repete em nenhum outro post forte (fica "solta").
// Cada tile é { id, energia, luz, tom, neutro }; energia null significa "cor não lida" e não pesa na nota.
import { LIMIAR_BARULHO, familiaDeTom } from './cor'

export const COLUNAS = 3
export const JANELA = 12 // 4 linhas: o que aparece quando alguém abre o perfil
const ESCURO = 0.3
const COR_FORTE = 0.45

const linhaDe = (i) => Math.floor(i / COLUNAS)
const colunaDe = (i) => i % COLUNAS
const peso = (i) => Math.max(0.5, 1 - linhaDe(i) * 0.1) // as primeiras linhas valem mais
const lido = (t) => t && t.energia != null
const PISO_FORTE = 0.35 // abaixo disso nada conta como forte, mesmo sendo o mais forte do feed

/**
 * A partir de que barulho um post conta como "cor forte" nesta janela. Relativo ao próprio feed:
 * o terço mais forte, com piso de 0,35 (feed todo calmo não é acusado) e teto de 0,6 (cor chapada forte sempre conta).
 * Fotos com texto raramente passam de 0,6 e continuam podendo brigar entre si.
 */
export function corteDeBarulho(tiles) {
  const energias = tiles.filter(lido).map((t) => t.energia).sort((a, b) => a - b)
  if (!energias.length) return LIMIAR_BARULHO
  const alvo = energias[Math.floor(0.65 * (energias.length - 1))]
  // Folga de 0,15 acima do mais calmo: feed uniforme (tudo do mesmo barulho) é harmônico, não vira "todos fortes".
  return Math.min(LIMIAR_BARULHO, Math.max(PISO_FORTE, alvo, energias[0] + 0.15))
}

const celula = (i) => `linha ${linhaDe(i) + 1}, coluna ${colunaDe(i) + 1}`
const PONTOS = { vizinho: 12, demais: 10, escuros: 6, solta: 5 }

function textoDoPar(i, j) {
  if (linhaDe(i) === linhaDe(j)) return `Dois posts de cor forte lado a lado (linha ${linhaDe(i) + 1}, colunas ${colunaDe(i) + 1} e ${colunaDe(j) + 1}).`
  return `Dois posts de cor forte um em cima do outro (coluna ${colunaDe(i) + 1}, linhas ${linhaDe(i) + 1} e ${linhaDe(j) + 1}).`
}

function vizinhos(n) {
  const pares = []
  for (let i = 0; i < n; i++) {
    if (colunaDe(i) < COLUNAS - 1 && i + 1 < n) pares.push([i, i + 1])
    if (i + COLUNAS < n) pares.push([i, i + COLUNAS])
  }
  return pares
}

function triplas(n) {
  const ts = []
  for (let i = 0; i + 2 * COLUNAS < n; i++) ts.push([i, i + COLUNAS, i + 2 * COLUNAS])
  for (let i = 0; i + 2 < n; i += COLUNAS) ts.push([i, i + 1, i + 2])
  return ts
}

/** Pior caso de uma janela de n tiles, só para a nota ficar entre 0 e 100 qualquer que seja o tamanho. */
const piorCaso = (n) => vizinhos(n).reduce((s, [i]) => s + PONTOS.vizinho * peso(i), 0) + PONTOS.demais

/** { nota, bruta, corte, fortes, problemas }. nota é inteira de 0 a 100 (ou null com menos de 2 tiles lidos); bruta é a mesma sem arredondar. */
export function avaliarGrade(tiles, { janela = JANELA } = {}) {
  const t = tiles.slice(0, janela)
  const lidos = t.filter(lido)
  if (lidos.length < 2) return { nota: null, bruta: null, corte: null, fortes: 0, problemas: [] }
  const corte = corteDeBarulho(t)
  const barulhento = (x) => lido(x) && x.energia >= corte
  const problemas = []
  let pen = 0
  for (const [i, j] of vizinhos(t.length)) {
    if (barulhento(t[i]) && barulhento(t[j])) {
      const pontos = PONTOS.vizinho * peso(i)
      pen += pontos
      problemas.push({ tipo: 'barulho-vizinho', indices: [i, j], pontos, texto: textoDoPar(i, j) })
    }
  }
  const fortes = t.map((x, i) => (barulhento(x) ? i : -1)).filter((i) => i >= 0)
  if (fortes.length / lidos.length > 0.5) {
    pen += PONTOS.demais
    problemas.push({ tipo: 'barulho-demais', indices: fortes, pontos: PONTOS.demais, texto: `Mais da metade dos ${t.length} primeiros posts é de cor forte. Intercalar com posts calmos dá descanso entre eles.` })
  }
  for (const tripla of triplas(t.length)) {
    if (tripla.every((i) => lido(t[i]) && t[i].luz < ESCURO)) {
      const pontos = PONTOS.escuros * peso(tripla[0])
      pen += pontos
      const eixo = linhaDe(tripla[0]) === linhaDe(tripla[2]) ? `linha ${linhaDe(tripla[0]) + 1}` : `coluna ${colunaDe(tripla[0]) + 1}`
      problemas.push({ tipo: 'escuros-seguidos', indices: tripla, pontos, texto: `Três posts escuros em sequência (${eixo}).` })
    }
  }
  const coloridos = t.map((x, i) => (lido(x) && !x.neutro && x.energia >= COR_FORTE ? i : -1)).filter((i) => i >= 0)
  if (coloridos.length >= 3) {
    const contagem = new Map()
    for (const i of coloridos) contagem.set(familiaDeTom(t[i].tom), (contagem.get(familiaDeTom(t[i].tom)) ?? 0) + 1)
    if ([...contagem.values()].some((c) => c >= 2)) {
      for (const i of coloridos) {
        if (contagem.get(familiaDeTom(t[i].tom)) === 1) {
          const pontos = PONTOS.solta * peso(i)
          pen += pontos
          problemas.push({ tipo: 'cor-solta', indices: [i], pontos, texto: `O post da ${celula(i)} tem uma cor que não aparece em nenhum outro post forte.` })
        }
      }
    }
  }
  const bruta = Math.max(0, Math.min(100, 100 * (1 - pen / piorCaso(t.length))))
  return { nota: Math.round(bruta), bruta, corte, fortes: fortes.length, problemas }
}

/** Fixados primeiro (o Instagram deixa até 3), depois os novos, depois o que já está publicado, do mais recente ao mais antigo. */
export function montarGrade({ fixados = [], novos = [], existentes = [] }) {
  const presos = new Set(fixados.map((t) => t.id))
  return [...fixados, ...novos, ...existentes.filter((t) => !presos.has(t.id))]
}

function* permutacoes(itens) {
  // Algoritmo de Heap: a primeira é a ordem original, então um empate nunca embaralha à toa.
  const a = [...itens]
  const c = new Array(a.length).fill(0)
  yield [...a]
  let i = 0
  while (i < a.length) {
    if (c[i] < i) {
      const k = i % 2 === 0 ? 0 : c[i]
      ;[a[k], a[i]] = [a[i], a[k]]
      yield [...a]
      c[i]++
      i = 0
    } else { c[i] = 0; i++ }
  }
}

const melhor = (candidatos, pontuar) => {
  let escolhido = null, nota = -Infinity
  for (const c of candidatos) {
    const n = pontuar(c)
    if (n > nota + 1e-9) { escolhido = c; nota = n }
  }
  return { escolhido, nota }
}

const notaBruta = (tiles, janela) => avaliarGrade(tiles, { janela }).bruta ?? -1

/** Melhor ordem para os posts que ainda não saíram. Até 7 testa todas; acima disso troca pares até não melhorar. */
export function melhorOrdemNovos({ fixados = [], novos = [], existentes = [], janela = JANELA }) {
  const pontuar = (ordem) => notaBruta(montarGrade({ fixados, novos: ordem, existentes }), janela)
  if (novos.length < 2) return { novos, grade: montarGrade({ fixados, novos, existentes }) }
  let ordem
  if (novos.length <= 7) ordem = melhor(permutacoes(novos), pontuar).escolhido
  else {
    ordem = [...novos]
    let atual = pontuar(ordem)
    for (let rodada = 0; rodada < 100; rodada++) {
      let ganho = null
      for (let i = 0; i < ordem.length; i++) for (let j = i + 1; j < ordem.length; j++) {
        const t = [...ordem]; [t[i], t[j]] = [t[j], t[i]]
        const n = pontuar(t)
        if (n > atual + 1e-9 && (!ganho || n > ganho.n)) ganho = { t, n }
      }
      if (!ganho) break
      ordem = ganho.t; atual = ganho.n
    }
  }
  return { novos: ordem, grade: montarGrade({ fixados, novos: ordem, existentes }) }
}

function* combinacoes(itens, k, inicio = 0, atual = []) {
  if (atual.length === k) { yield atual; return }
  for (let i = inicio; i < itens.length; i++) yield* combinacoes(itens, k, i + 1, [...atual, itens[i]])
}

/**
 * Quais posts já publicados fixar (até `max`, na ordem certa) para a primeira linha da grade ficar mais calma.
 * Só sugere fixar se a nota subir; sem ganho devolve lista vazia.
 */
export function melhoresFixados({ novos = [], existentes = [], max = 3, candidatos = 24, janela = JANELA }) {
  const pool = existentes.slice(0, candidatos).filter(lido)
  const pontuar = (fixados) => notaBruta(montarGrade({ fixados, novos, existentes }), janela)
  let melhorLista = [], melhorNota = pontuar([])
  for (let k = 1; k <= Math.min(max, pool.length); k++) {
    for (const combo of combinacoes(pool, k)) {
      for (const ordem of permutacoes(combo)) {
        const n = pontuar(ordem)
        if (n > melhorNota + 1e-9) { melhorLista = ordem; melhorNota = n }
      }
    }
  }
  return { fixados: melhorLista, grade: montarGrade({ fixados: melhorLista, novos, existentes }) }
}

/**
 * Ordem ideal da janela inteira, sem a regra do Instagram: troca de lugar qualquer par que melhore a nota.
 * É uma simulação. O Instagram mostra os posts em ordem de data, então só dá para chegar lá fixando e repostando.
 */
export function ordemIdeal(tiles, { janela = JANELA } = {}) {
  let ordem = [...tiles]
  let atual = notaBruta(ordem, janela)
  for (let rodada = 0; rodada < 60; rodada++) {
    let ganho = null
    for (let i = 0; i < Math.min(janela, ordem.length); i++) for (let j = i + 1; j < ordem.length; j++) {
      const t = [...ordem]; [t[i], t[j]] = [t[j], t[i]]
      const n = notaBruta(t, janela)
      if (n > atual + 1e-9 && (!ganho || n > ganho.n)) ganho = { t, n }
    }
    if (!ganho) break
    ordem = ganho.t; atual = ganho.n
  }
  return ordem
}
