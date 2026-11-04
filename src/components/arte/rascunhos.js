// Regras dos rascunhos do Studio de Arte. Funções puras: sem React, sem banco.
import { legendaCurta } from '../../lib/igMedia'
import { CARTAO } from './cartoes/colecao'
import { ehCartao, textosDe } from './cartoes/render'
import { textoDoCard } from './pacotePublicacao'
import { TEMPLATES } from './Templates'

/** O card tem algo da pessoa: texto que difere do exemplo do modelo, foto ou emoji. */
function temConteudo(slide) {
  // O modelo base já vem com um emoji de exemplo: só conta emoji que existe e é diferente dele.
  const padrao = ehCartao(slide) ? {} : TEMPLATES[slide.template]?.padrao ?? {}
  if (slide.emojis?.length && JSON.stringify(slide.emojis) !== JSON.stringify(padrao.emojis ?? [])) return true
  if (ehCartao(slide)) {
    const def = CARTAO[slide.cartao]
    const mudouTexto = Object.entries(slide.textos ?? {}).some(([id, valor]) => valor !== def.campos.find((c) => c.id === id)?.padrao)
    return mudouTexto || Object.values(slide.fotos ?? {}).some(Boolean)
  }
  const escreveu = ['titulo', 'texto', 'detalhe'].some((k) => (slide[k] || '') && slide[k] !== padrao[k])
  return escreveu || !!slide.foto
}

/** Só o exemplo do modelo, ou o editor limpo: não há o que guardar. */
export const arteSemConteudo = (projeto) => !projeto.slides.some(temConteudo)

const limpar = (t) => String(t ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()

/** Primeiro texto escrito do card (o título, no modelo base): serve de nome. */
export function primeiroTexto(slide) {
  if (ehCartao(slide)) {
    const def = CARTAO[slide.cartao]
    const textos = textosDe(def, slide)
    return def.campos.map((c) => limpar(textos[c.id])).find(Boolean) || ''
  }
  return ['titulo', 'texto', 'detalhe'].map((k) => limpar(slide[k])).find(Boolean) || ''
}

/** Nome de rascunho quando a pessoa não deu um: começo do primeiro título e o dia. */
export function nomeAutomatico(projeto, data = new Date()) {
  const primeiro = projeto.slides.map(primeiroTexto).find(Boolean) || 'Sem título'
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${legendaCurta(primeiro, 40)} · ${dia}`
}

export const ehRascunho = (arte) => !!arte?.projeto?.rascunho

/** Texto dos cards para o roteiro do card no Hub de Ideias. */
export const roteiroDosCards = (projeto) =>
  projeto.slides.map((s, i) => `Card ${i + 1}\n${textoDoCard(s) || '(sem texto)'}`).join('\n\n')
