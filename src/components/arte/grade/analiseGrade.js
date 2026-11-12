// Junta as buscas de harmonia numa análise só para a tela. Pura: recebe tiles já lidos e devolve o que sugerir.
// Cada sugestão é calculada sobre a grade como está agora, então dá para aplicar uma sem depender das outras.
import { sugerirFundo } from './ajusteDeCor'
import { JANELA, avaliarGrade, melhorOrdemNovos, melhoresFixados, montarGrade, ordemIdeal } from './harmonia'

// Menos que isso é ruído de arredondamento ou do peso das linhas, não vale mexer na grade.
const GANHO_MINIMO = 3

const mesmaOrdem = (a, b) => a.length === b.length && a.every((t, i) => t.id === b[i].id)

/**
 * tiles: { fixados, novos, existentes } com tiles { id, energia, luz, tom, neutro }.
 * capas: { [idDoNovo]: slide da capa }, usado só para sugerir troca de fundo.
 */
export function analisarGrade({ fixados = [], novos = [], existentes = [], capas = {}, janela = JANELA }) {
  const grade = montarGrade({ fixados, novos, existentes })
  const atual = avaliarGrade(grade, { janela })
  if (atual.nota == null) return { atual, semDados: true, ordem: null, fixar: null, fundos: [], ideal: null }

  const nota = (g) => avaliarGrade(g, { janela }).nota

  const ordem = melhorOrdemNovos({ fixados, novos, existentes, janela })
  const ordemSugerida = !mesmaOrdem(novos, ordem.novos) && nota(ordem.grade) - atual.nota >= GANHO_MINIMO
    ? { ids: ordem.novos.map((t) => t.id), nota: nota(ordem.grade) }
    : null

  const fx = melhoresFixados({ novos, existentes, janela })
  const fixar = fx.fixados.length && !mesmaOrdem(fixados, fx.fixados) && nota(fx.grade) - atual.nota >= GANHO_MINIMO
    ? { ids: fx.fixados.map((t) => t.id), nota: nota(fx.grade) }
    : null

  const fundos = novos.flatMap((t) => {
    const capa = capas[t.id]
    if (!capa) return []
    const notaCom = (projetado) => avaliarGrade(montarGrade({ fixados, novos: novos.map((n) => (n.id === t.id ? projetado : n)), existentes }), { janela }).bruta ?? -1
    const s = sugerirFundo(capa, t, notaCom)
    return s ? [{ id: t.id, fundoAtual: capa.fundo, fundo: s.fundo, slide: s.slide, nota: Math.round(s.nota), mudouTexto: s.mudancas > 0 }] : []
  })

  const ideal = ordemIdeal(grade, { janela })
  return { atual, semDados: false, ordem: ordemSugerida, fixar, fundos, ideal: { ids: ideal.map((t) => t.id), nota: nota(ideal) } }
}

/**
 * Nota (sem arredondar) da grade inteira se este tile novo trocar de lugar com a versão que vem no argumento.
 * Serve para ranquear versões de uma arte (outro fundo, outro layout) pelo efeito na grade.
 */
export function criarNotaCom({ fixados = [], novos = [], existentes = [], janela = JANELA }) {
  return (tile) => avaliarGrade(montarGrade({ fixados, novos: novos.map((n) => (n.id === tile.id ? tile : n)), existentes }), { janela }).bruta ?? -1
}

/**
 * Quais outros posts ficariam melhor na posição de `indice`: troca o tile clicado com cada um e mede a grade.
 * `real` é verdadeiro quando os dois são posts novos (dá para publicar nessa ordem); com post já publicado
 * no meio, a troca só existe na simulação.
 */
export function sugerirTrocas(grade, indice, { janela = JANELA, max = 3, ganhoMinimo = 1 } = {}) {
  const de = grade[indice]
  if (!de || de.energia == null) return []
  const base = avaliarGrade(grade, { janela }).bruta
  if (base == null) return []
  const achados = []
  grade.forEach((com, j) => {
    if (j === indice || com.energia == null) return
    const trocada = [...grade]
    trocada[indice] = com
    trocada[j] = de
    const bruta = avaliarGrade(trocada, { janela }).bruta
    if (bruta - base >= ganhoMinimo) achados.push({ id: com.id, indiceDe: indice, indice: j, nota: Math.round(bruta), ganho: bruta - base, real: de.origem === 'novo' && com.origem === 'novo' })
  })
  return achados.sort((a, b) => b.nota - a.nota || Math.abs(a.indice - indice) - Math.abs(b.indice - indice) || a.indice - b.indice).slice(0, max)
}
