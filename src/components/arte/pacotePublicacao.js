// Pacote de publicação do carrossel: legenda, texto alternativo de cada card e o checklist dos gates
// (.claude/sistema-de-conteudo.md, seção 5). Funções puras: sem React, sem DOM.
import { CARTAO } from './cartoes/colecao'
import { ehCartao, textosDe } from './cartoes/render'

export const LIMITE_LEGENDA = 2200
export const LIMITE_ALT = 100

/** Os seis gates da seção 5. "soTerca" só vale para o carrossel de contagem. */
export const GATES = [
  { id: 'funcao', titulo: 'Função', pergunta: 'Em uma frase: o post serve pra trazer gente nova, gerar valor ou criar afinidade?' },
  { id: 'comportamento', titulo: 'Comportamento', pergunta: 'O que a pessoa faz? Contar, salvar, mandar pra alguém, comentar um número. "Concordar" não basta.' },
  { id: 'contagem', titulo: 'Contagem (só terça)', pergunta: 'A abertura se responde com um número inteiro, e a pessoa precisa parar pra descobrir qual é.', soTerca: true },
  { id: 'cpf', titulo: 'CPF', pergunta: 'Tem um traço reconhecível da Karen: critério, experiência, processo ou dado próprio.' },
  { id: 'ponte', titulo: 'Ponte', pergunta: 'Termina com verbo de ação e destino nomeado. Não vale "reflita" nem "e você?".' },
  { id: 'protecao', titulo: 'Proteção', pergunta: 'É pessoalidade, não exposição que a Karen não quer sustentar.' },
]

export const pacoteDe = (projeto) => ({ legenda: '', ...(projeto?.pacote ?? {}), gates: { ...(projeto?.pacote?.gates ?? {}) } })

const limpar = (t) => String(t ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()

/** Texto que aparece no card, na ordem de leitura. */
export function textoDoCard(slide) {
  if (ehCartao(slide)) {
    const def = CARTAO[slide.cartao]
    const textos = textosDe(def, slide)
    return def.campos.map((c) => limpar(textos[c.id])).filter(Boolean).join(' ')
  }
  return ['titulo', 'texto', 'detalhe']
    .filter((id) => !slide.est?.[id]?.oculto)
    .map((id) => limpar(slide[id]))
    .filter(Boolean)
    .join(' ')
}

/** Rascunho de texto alternativo: "Card 2 de 7: <o que está escrito>", cortado no limite. */
export function sugerirAlt(slide, indice, total, limite = LIMITE_ALT) {
  const inicio = `Card ${indice + 1} de ${total}: `
  const corpo = textoDoCard(slide)
  if (!corpo) return inicio.trim().replace(/:$/, '')
  const cabe = limite - inicio.length
  const texto = corpo.length > cabe ? `${corpo.slice(0, Math.max(0, cabe - 1)).trimEnd()}…` : corpo
  return `${inicio}${texto}`
}

/** Trechos entre colchetes que ficaram para a Karen preencher, como [SUA LEITURA] ou [SEU NÚMERO]. */
export const colchetes = (legenda = '') => [...new Set(legenda.match(/\[[^\]\n]{1,60}\]/g) ?? [])]

export const gatesConferidos = (projeto) => {
  const { gates } = pacoteDe(projeto)
  return GATES.filter((g) => gates[g.id]).length
}

/** Arquivos de texto que acompanham os PNGs no ZIP. Só entram se houver algo escrito. */
export function arquivosDoPacote(projeto, indices) {
  const extras = {}
  const { legenda } = pacoteDe(projeto)
  if (legenda.trim()) extras['legenda.txt'] = `${legenda.trim()}\n`
  const alts = indices
    .map((i) => ({ i, alt: (projeto.slides[i]?.alt ?? '').trim() }))
    .filter((x) => x.alt)
    .map(({ i, alt }) => `card-${String(i + 1).padStart(2, '0')}: ${alt}`)
  if (alts.length) extras['alt-text.txt'] = `${alts.join('\n')}\n`
  return extras
}
