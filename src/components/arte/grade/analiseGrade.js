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
