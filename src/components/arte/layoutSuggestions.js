import { TEMPLATES } from './Templates'
import { CARTAO, CARTOES } from './cartoes/colecao'
import { fotosDe, formatoDe, novoCartao, textosDe, urlFoto } from './cartoes/render'
import { normalizar } from './marca'

const BASE = {
  tarjas: ['Tarjas sobre foto', 'titulo', 65, 150, true],
  atrasCabeca: ['Texto atrás da cabeça', 'cabeca', 12, 100, true],
  cabecaCaixa: ['Cabeça sobre o bloco', 'cabeca', 65, 0, true],
  corCheia: ['Frase em cor cheia', 'titulo', 120, 650, false],
  caixa: ['Caixa tracejada', 'titulo', 90, 650, true],
  selecao: ['Seleção de texto', 'titulo', 110, 450, false],
  chat: ['Conversa', 'baloes', 75, 500, false],
  busca: ['Barra de busca', 'interface', 80, 300, false],
}
export const idLayout = s => s.template === 'cartao' ? `cartao:${s.cartao}` : s.template
const limpo = s => String(s ?? '').replace(/\*/g, '').trim()
const limite = c => Math.max(25, Math.ceil(limpo(c.padrao).length * 1.6))
const campoCorpo = c => c.texto && c.texto !== c.titulo ? c.texto : c.campos.find(k => k.id !== (c.titulo || c.campos[0].id) && /linha|texto|parágrafo|mensagem|balão|rodapé/i.test(k.rotulo))?.id
export const CATALOGO_LAYOUTS = [
  ...Object.entries(BASE).map(([id, [nome, familia, titulo, corpo, foto]]) => ({ id, nome, familia, titulo, corpo, fotos: foto ? 1 : 0, formatos: ['feed', 'story'] })),
  ...CARTOES.map(c => ({ id: `cartao:${c.id}`, nome: c.nome, familia: c.categoria, formatos: [formatoDe(c)], fotos: fotosDe(c).length, def: c, campoTitulo: c.titulo || c.campos[0].id, campoCorpo: campoCorpo(c), titulo: limite(c.campos.find(k => k.id === c.titulo) || c.campos[0]), corpo: c.campos.find(k => k.id === campoCorpo(c)) ? limite(c.campos.find(k => k.id === campoCorpo(c))) : 0 })),
]

export function conteudoLayout(s) {
  if (s.template !== 'cartao') return { titulo: s.titulo || '', corpo: [s.texto, s.detalhe].filter(Boolean).join('\n\n'), fotos: s.foto ? [s.foto] : [], recorte: s.recorte || '' }
  const def = CARTAO[s.cartao]
  const textos = textosDe(def, s)
  const principal = def.titulo || def.campos.find(c => textos[c.id]?.trim())?.id
  const outros = def.campos.filter(c => c.id !== principal).map(c => textos[c.id]).filter(t => t?.trim())
  const slots = fotosDe(def)
  const fotos = slots.map(slot => urlFoto(def, s, slot))
  const slot = def.cabeca?.slot
  const recorte = slot ? (s.fotos && `${slot}:recorte` in s.fotos ? s.fotos[`${slot}:recorte`] : `/marca/cartoes/${def.cabeca.recorte}`) : ''
  return { titulo: textos[principal] || '', corpo: outros.join('\n\n'), fotos, recorte }
}

function transferir(source, item, conteudo) {
  if (idLayout(source) === item.id) return source
  const { titulo, corpo, fotos, recorte } = conteudo
  if (item.def) {
    const def = item.def
    const textos = Object.fromEntries(def.campos.map(c => [c.id, '']))
    textos[item.campoTitulo] = titulo
    if (item.campoCorpo) textos[item.campoCorpo] = corpo
    const slots = fotosDe(def)
    const fotosNovas = Object.fromEntries(slots.map((slot, i) => [slot, fotos[i] || fotos[0]]).filter(([, foto]) => foto))
    if (def.cabeca && fotos.length) fotosNovas[`${def.cabeca.slot}:recorte`] = recorte
    return novoCartao(def.id, { textos, fotos: fotosNovas })
  }
  const padrao = { ...TEMPLATES[item.id].padrao, template: item.id }
  return normalizar({ titulo, texto: corpo, detalhe: '', foto: fotos[0] || '', recorte, ...(source.template !== 'cartao' ? Object.fromEntries(['fundo', 'corTitulo', 'corTexto', 'corDestaque', 'corTarja'].map(k => [k, source[k]])) : {}) }, padrao)
}

/** Pré-filtro e pontuação editorial; não é previsão de desempenho nas redes. */
export function classificarLayouts(source, { formato = 'feed', papel = 'explicacao', anteriores = [], preferido = '' } = {}) {
  const conteudo = conteudoLayout(source)
  const atual = idLayout(source)
  const ocultos = Object.values(source.camadas || source.est || {}).some(c => c.oculto)
  const afinidade = { capa: ['titulo', 'cabeca', 'series'], fechamento: ['titulo'], conversa: ['baloes'], lista: ['pilulas', 'interface'], explicacao: ['titulo', 'interface'] }
  return CATALOGO_LAYOUTS.flatMap(item => {
    if (!item.formatos.includes(formato)) return []
    if (ocultos && item.id !== atual) return [] // Não ressuscitar elementos apagados ao trocar o modelo.
    if (item.id !== atual) {
      if (limpo(conteudo.titulo).length > item.titulo || limpo(conteudo.corpo).length > item.corpo) return []
      if (conteudo.fotos.length > item.fotos || (item.def && conteudo.fotos.length !== item.fotos)) return []
      if (!conteudo.fotos.length && item.fotos > 0 && item.def) return [] // Não introduzir fotos de outra arte.
      if ((item.def?.cabeca || TEMPLATES[item.id]?.recorta) && (!conteudo.fotos.length || !conteudo.recorte)) return []
      if (['chat', 'busca'].includes(item.id) && !['conversa', 'lista'].includes(papel)) return []
    }
    const motivos = ['Formato compatível', 'Conteúdo preservado']
    let pontos = 55
    if (afinidade[papel]?.includes(item.familia)) { pontos += 18; motivos.push(`Composição adequada para ${papel === 'explicacao' ? 'explicação' : papel}`) }
    if (conteudo.fotos.length) { pontos += 10; motivos.push('Mantém as fotos do slide') }
    if (item.id === preferido) { pontos += 40; motivos.push('Modelo pedido por você') }
    if (anteriores.includes(item.id)) { pontos -= 20; motivos.push('Repete um modelo recente') }
    else { pontos += 8; motivos.push('Varia a composição da sequência') }
    const ocupacao = Math.max(limpo(conteudo.titulo).length / item.titulo, conteudo.corpo ? limpo(conteudo.corpo).length / (item.corpo || 1) : 0)
    if (ocupacao > 0.85) pontos -= 12
    if (item.id === atual) pontos += 2
    return [{ ...item, pontos: Math.max(0, Math.min(100, pontos)), motivos, slide: transferir(source, item, conteudo) }]
  }).sort((a, b) => b.pontos - a.pontos || a.id.localeCompare(b.id))
}
