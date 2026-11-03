// Regras puras do slide do Studio de Arte: criação, conteúdo que atravessa a troca de modelo, tamanho da arte.
// Sem React e sem DOM, por isso têm teste unitário (conteudoSlide.test.js).
import { FORMATOS, normalizar } from './marca'
import { TEMPLATES } from './Templates'
import { CARTAO } from './cartoes/colecao'
import { camposPrincipais, ehCartao, fotosDe, novoCartao } from './cartoes/render'

export const novoSlide = (template = 'tarjas', herdado = {}) => normalizar(herdado, { ...TEMPLATES[template].padrao, template })
export const PROJETO_INICIAL = { formato: 'feed', contador: false, atual: 0, slides: [novoSlide()] }

export const NOMES_BLOCO = { titulo: 'Título', texto: 'Texto', detalhe: 'Detalhe manuscrito' }
export const LARGURA_PADRAO = { titulo: 920, texto: 880, detalhe: 460 }
export const ehCamada = (chave) => chave?.startsWith('camada:')

// Modelos base que usam foto quando ela existe.
export const BASE_COM_FOTO = ['tarjas', 'atrasCabeca', 'cabecaCaixa', 'caixa', 'selecao']

/** Tamanho da arte: os cards da coleção têm o tamanho do original; os modelos base seguem o formato do projeto. */
export const tamanho = (slide, formato) => (ehCartao(slide) ? { w: CARTAO[slide.cartao].w, h: CARTAO[slide.cartao].h } : FORMATOS[formato])
export const padraoDe = (s) => (ehCartao(s) ? novoCartao(s.cartao) : novoSlide(s.template))


/**
 * Título, texto e foto que ela mesma colocou no slide (o exemplo do modelo não conta).
 * O slide guarda isso em s.conteudo, então o texto atravessa qualquer troca de modelo,
 * mesmo passando por um modelo que não tinha lugar para ele.
 */
export function conteudoProprio(s) {
  const guardado = s.conteudo ?? {}
  let atual
  if (ehCartao(s)) {
    const def = CARTAO[s.cartao]
    const { titulo, texto } = camposPrincipais(def)
    const proprio = (id) => (id && s.textos?.[id] != null && s.textos[id] !== def.campos.find((c) => c.id === id)?.padrao ? s.textos[id] : undefined)
    atual = { titulo: proprio(titulo), texto: proprio(texto), foto: s.fotos?.[fotosDe(def)[0]] }
  } else {
    const p = TEMPLATES[s.template].padrao
    atual = { titulo: s.titulo !== p.titulo ? s.titulo : undefined, texto: s.texto !== p.texto ? s.texto : undefined, foto: s.foto || undefined }
  }
  return { titulo: atual.titulo ?? guardado.titulo, texto: atual.texto ?? guardado.texto, foto: atual.foto ?? guardado.foto }
}

/** Passa para o slide novo o que ela já tinha escrito e a foto. */
export function levarConteudo(de, para) {
  const conteudo = conteudoProprio(de)
  const { titulo, texto, foto } = conteudo
  if (ehCartao(para)) {
    const def = CARTAO[para.cartao]
    const campos = camposPrincipais(def)
    const textos = { ...para.textos }
    // *trecho* só faz sentido onde o campo do modelo usa essa marca.
    const usaMarca = def.campos.find((c) => c.id === campos.titulo)?.padrao.includes('*')
    if (titulo != null && campos.titulo) textos[campos.titulo] = usaMarca ? titulo : titulo.replace(/\*/g, '')
    if (texto != null && campos.texto) textos[campos.texto] = texto
    // Pedaços da frase de exemplo que ficariam colados na frase dela.
    if (titulo != null && campos.titulo) for (const id of def.recebe?.[2] ?? []) textos[id] = ''
    const slot = fotosDe(def)[0]
    return { ...para, conteudo, textos, fotos: foto && slot ? { ...para.fotos, [slot]: foto } : para.fotos }
  }
  return normalizar({ conteudo, ...(titulo != null && { titulo }), ...(texto != null && { texto }), ...(foto && { foto, veu: 0.3 }) }, para)
}

// Foto em data URL vira um endereço curto (blob) nas miniaturas: 49 cópias da foto inteira pesariam no celular.
export const fotosLeves = new Map()
export const leve = (url) => {
  if (typeof url !== 'string' || !url.startsWith('data:')) return url
  if (!fotosLeves.has(url)) {
    const [cab, dados] = url.split(',')
    const bytes = Uint8Array.from(atob(dados), (c) => c.charCodeAt(0))
    fotosLeves.set(url, URL.createObjectURL(new Blob([bytes], { type: cab.slice(5).split(';')[0] })))
  }
  return fotosLeves.get(url)
}
export const aliviar = (s) => (ehCartao(s)
  ? { ...s, fotos: Object.fromEntries(Object.entries(s.fotos ?? {}).map(([k, v]) => [k, leve(v)])) }
  : { ...s, foto: leve(s.foto), recorte: leve(s.recorte) })

/** Ajustes de posição, tamanho, fonte ou corte que se perdem na troca de modelo. */
export const temAjustes = (s) => (ehCartao(s) ? Object.keys(s.camadas ?? {}).length > 0 : Object.keys(s.est ?? {}).length > 0 || JSON.stringify(s.pos) !== JSON.stringify(TEMPLATES[s.template].padrao.pos))
