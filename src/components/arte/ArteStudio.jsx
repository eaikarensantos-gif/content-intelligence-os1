import { createContext, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import useHistorico from './useHistorico'
import { avaliarLayouts } from './avaliarLayouts'
import { CATALOGO_LAYOUTS, idLayout } from './layoutSuggestions'
import SugestoesLayout from './SugestoesLayout'
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, Copy, Download, ImagePlus, Images, LayoutGrid, Loader2, Plus, RotateCcw, Undo2, Redo2, Scissors, Trash2 } from 'lucide-react'
import { CORES, EMOJIS, FONTES, FONTE_DETALHE, FORMATOS, emojiUrl, hex, normalizar } from './marca'
import { TEMPLATES, Emojis } from './Templates'
import { lerRascunho, salvarRascunho } from './armazem'
import { prepararFoto, recortarPessoa } from './recorte'
import { fixarTextos, montarProjeto, pedidoDeSlides, pedirArte, pegarEntrada } from './pedido'
import { CARTAO, CARTOES, CATEGORIAS } from './cartoes/colecao'
import { camposDaCamada, camposPrincipais, descreverCamada, ehCartao, formatoDe, fotosDe, normalizarCartao, novoCartao, textosDe, urlFoto } from './cartoes/render'
import { CartaoCorpo } from './cartoes/Cartao'
import Galeria from './Galeria'
import Pedido from './Pedido.jsx'
import Banco from './Banco.jsx'
import ArtesSalvas from './ArtesSalvas'
import EdicaoNaArte from './EdicaoNaArte'
import VisaoGeral from './VisaoGeral'
import RevisaoFinal from './RevisaoFinal'
import { revisarCards, gerarDownload, mesmaArte } from './exportacaoArte'
import { aplicarEmLote, reordenarProjeto, encaixarBloco } from './ajustesProjeto'
import './marca.css'

const novoSlide = (template = 'tarjas', herdado = {}) => normalizar(herdado, { ...TEMPLATES[template].padrao, template })
const PROJETO_INICIAL = { formato: 'feed', contador: false, atual: 0, slides: [novoSlide()] }

const NOMES_BLOCO = { titulo: 'Título', texto: 'Texto', detalhe: 'Detalhe manuscrito' }
const LARGURA_PADRAO = { titulo: 920, texto: 880, detalhe: 460 }
const ehCamada = (chave) => chave?.startsWith('camada:')

// Modelos base que usam foto quando ela existe.
const BASE_COM_FOTO = ['tarjas', 'atrasCabeca', 'cabecaCaixa', 'caixa', 'selecao']

/** Tamanho da arte: os cards da coleção têm o tamanho do original; os modelos base seguem o formato do projeto. */
const tamanho = (slide, formato) => (ehCartao(slide) ? { w: CARTAO[slide.cartao].w, h: CARTAO[slide.cartao].h } : FORMATOS[formato])
const padraoDe = (s) => (ehCartao(s) ? novoCartao(s.cartao) : novoSlide(s.template))


/**
 * Título, texto e foto que ela mesma colocou no slide (o exemplo do modelo não conta).
 * O slide guarda isso em s.conteudo, então o texto atravessa qualquer troca de modelo,
 * mesmo passando por um modelo que não tinha lugar para ele.
 */
function conteudoProprio(s) {
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
function levarConteudo(de, para) {
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
const fotosLeves = new Map()
const leve = (url) => {
  if (typeof url !== 'string' || !url.startsWith('data:')) return url
  if (!fotosLeves.has(url)) {
    const [cab, dados] = url.split(',')
    const bytes = Uint8Array.from(atob(dados), (c) => c.charCodeAt(0))
    fotosLeves.set(url, URL.createObjectURL(new Blob([bytes], { type: cab.slice(5).split(';')[0] })))
  }
  return fotosLeves.get(url)
}
const aliviar = (s) => (ehCartao(s)
  ? { ...s, fotos: Object.fromEntries(Object.entries(s.fotos ?? {}).map(([k, v]) => [k, leve(v)])) }
  : { ...s, foto: leve(s.foto), recorte: leve(s.recorte) })

/** Ajustes de posição, tamanho, fonte ou corte que se perdem na troca de modelo. */
const temAjustes = (s) => (ehCartao(s) ? Object.keys(s.camadas ?? {}).length > 0 : Object.keys(s.est ?? {}).length > 0 || JSON.stringify(s.pos) !== JSON.stringify(TEMPLATES[s.template].padrao.pos))

// Bloco fica fora do Canvas para manter a mesma identidade entre renders: recriado a cada
// movimento, ele remontaria e perderia o arrasto no meio.
const ArrastoCtx = createContext(null)

function Bloco({ id, largura, children }) {
  const { arte, alca, selecionado, interativo } = useContext(ArrastoCtx)
  const p = arte.pos[id] ?? { x: 80, y: 200 }
  const a = alca(id, p.x, p.y)
  const w = arte.est?.[id]?.largura ?? largura
  if (arte.est?.[id]?.oculto) return null
  return (
    <div data-elemento={id} {...(interativo ? a : {})} style={{ ...(interativo ? a.style : {}), position: 'absolute', left: p.x, top: p.y, width: w, outline: interativo && selecionado === id ? '4px dashed #F97316' : 'none', outlineOffset: 12 }}>
      {children}
    </div>
  )
}

/** A arte em tamanho real; o pai reduz com scale para caber na tela. */
function Canvas({ arte, formato, contador, escala = 1, onMover, onMoverCamada, onSelecionar, selecionado, nodeRef, interativo = true, grao = true }) {
  const { w, h } = tamanho(arte, formato)
  const cartao = ehCartao(arte)
  const T = TEMPLATES[arte.template]
  const arrasto = useRef(null)

  const iniciar = (e, chave, x, y) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { chave, x0: e.clientX, y0: e.clientY, x, y }
    onSelecionar?.(chave)
  }
  const mover = (e) => {
    const d = arrasto.current
    if (!d) return
    if (!d.movendo && Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 3) return
    d.movendo = true
    onMover(d.chave, Math.round(d.x + (e.clientX - d.x0) / escala), Math.round(d.y + (e.clientY - d.y0) / escala))
  }
  const soltar = () => { arrasto.current = null }
  const alca = (chave, x, y) => ({ onPointerDown: (e) => iniciar(e, chave, x, y), onPointerMove: mover, onPointerUp: soltar, onPointerCancel: soltar, onLostPointerCapture: soltar, style: { cursor: 'move', touchAction: 'none' } })

  return (
    <div ref={nodeRef} tabIndex={interativo ? 0 : undefined} aria-label={interativo ? 'Área de edição da arte' : undefined} onPointerDownCapture={interativo ? (e) => e.currentTarget.focus({ preventScroll: true }) : undefined} data-canvas={interativo ? 'editor' : 'miniatura'} {...(interativo && arte.foto ? alca('foto', arte.fotoDX ?? 0, arte.fotoDY ?? 0) : { onPointerDown: () => interativo && onSelecionar?.(null) })} style={{ position: 'relative', width: w, height: h, overflow: 'hidden', background: cartao ? '#2B211B' : hex(arte.fundo), touchAction: interativo ? 'none' : undefined }}>
      {cartao ? (
        <CartaoCorpo arte={arte} interativo={interativo} selecionado={selecionado} onSelecionar={onSelecionar} onMoverCamada={onMoverCamada} escala={escala} grao={grao} />
      ) : (
        <ArrastoCtx.Provider value={{ arte, alca, selecionado, interativo }}>
          <T.Corpo a={arte} Bloco={Bloco} />
        </ArrastoCtx.Provider>
      )}
      <Emojis a={arte} />
      {arte.assinatura && <div style={{ position: 'absolute', left: 64, bottom: 36, maxWidth: w - 128, padding: '8px 16px', fontFamily: 'Arial, sans-serif', fontSize: 28, lineHeight: 1.2, color: '#2B211B', background: '#F4EFE7', whiteSpace: 'pre-wrap' }}>{arte.assinatura}</div>}
      {contador && (
        <div style={{ position: 'absolute', right: 70, top: 56, fontFamily: FONTE_DETALHE, fontSize: 40, color: hex(['cafe', 'tinta', 'terracota'].includes(arte.fundo) ? 'creme' : 'cafe') }}>{contador}</div>
      )}
      {interativo && arte.emojis.map((e, i) => (
        <div key={i} data-elemento={`emoji:${i}`} {...alca(`emoji:${i}`, e.x, e.y)} style={{ position: 'absolute', left: e.x, top: e.y, width: e.tam, height: e.tam, cursor: 'move', touchAction: 'none', outline: selecionado === `emoji:${i}` ? '4px dashed #F97316' : 'none' }} />
      ))}
    </div>
  )
}

const Cores = ({ valor, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {Object.entries(CORES).map(([k, c]) => (
      <button key={k} type="button" title={c.nome} onClick={() => onChange(k)}
        className={`w-7 h-7 rounded-full border ${valor === k ? 'ring-2 ring-offset-1 ring-orange-500' : 'border-gray-300'}`} style={{ background: c.hex }} />
    ))}
  </div>
)

const Campo = ({ rotulo, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-500 mb-1">{rotulo}</span>
    {children}
  </label>
)

const Faixa = ({ rotulo, valor, min, max, passo = 1, onChange }) => (
  <Campo rotulo={`${rotulo}: ${valor}`}>
    <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
  </Campo>
)



export default function ArteStudio() {
  const { projeto, setProjeto, navegar, reset, desfazer, refazer, podeDesfazer, podeRefazer, iniciarGrupo, encerrarGrupo } = useHistorico(PROJETO_INICIAL)
  const [carregado, setCarregado] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [ocupado, setOcupado] = useState('')
  const [aviso, setAviso] = useState('')
  const [anterior, setAnterior] = useState(null)
  const [bancoAberto, setBancoAberto] = useState(false)
  const [fotoAlvo, setFotoAlvo] = useState(null)
  const [galeria, setGaleria] = useState(false)
  const [catVisual, setCatVisual] = useState(null)
  const [edicao, setEdicao] = useState(null)
  const [revisao, setRevisao] = useState(null)
  const [guiasAtivas, setGuiasAtivas] = useState(true)
  const [guias, setGuias] = useState([])
  const node = useRef(null)
  const projetoAtual = useRef(projeto)
  projetoAtual.current = projeto
  const [sugestoes, setSugestoes] = useState({})
  const [analisandoLayout, setAnalisandoLayout] = useState(null)

  const { formato, slides, atual } = projeto
  const arte = slides[atual]
  const cartao = ehCartao(arte)
  const def = cartao ? CARTAO[arte.cartao] : null
  const { w, h } = tamanho(arte, formato)
  // No celular a arte encolhe para caber na tela, com o painel logo abaixo.
  const escala = Math.min(520, typeof window !== 'undefined' ? window.innerWidth - 48 : 520) / w
  const contadorDe = (i) => (projeto.contador && slides.length > 1 ? `${i + 1}/${slides.length}` : '')

  useEffect(() => {
    lerRascunho().then((salvo) => {
      if (salvo?.slides?.length) {
        const slides = salvo.slides
          .filter((s) => s.template in TEMPLATES || ehCartao(s))
          .map((s) => (ehCartao(s) ? normalizarCartao(s) : normalizar(s, { ...TEMPLATES[s.template].padrao, template: s.template })))
        if (slides.length) reset({ ...PROJETO_INICIAL, ...salvo, slides, atual: Math.min(salvo.atual ?? 0, slides.length - 1) })
      }
      setCarregado(true)
    })
  }, [reset])
  useEffect(() => { if (carregado) salvarRascunho(projeto) }, [projeto, carregado])

  const mudarProjeto = (campos) => setProjeto((p) => ({ ...p, ...campos }))
  const mudarSlide = (fn) => setProjeto((p) => ({ ...p, slides: p.slides.map((s, i) => (i === p.atual ? fn(s) : s)) }))
  const mudar = (campos) => mudarSlide((s) => ({ ...s, ...campos }))
  const mudarEst = (id, campos) => mudarSlide((s) => ({ ...s, est: { ...s.est, [id]: { ...(s.est?.[id] ?? {}), ...campos } } }))
  const mudarCamada = (i, campos) => mudarSlide((s) => ({ ...s, camadas: { ...s.camadas, [i]: { ...(s.camadas?.[i] ?? {}), ...campos } } }))
  const mudarTexto = (id, valor) => mudarSlide((s) => ({ ...s, textos: { ...s.textos, [id]: valor } }))
  const apagarElemento = (id) => {
    if (id === 'foto') mudar({ foto: '', recorte: '' })
    else if (ehCamada(id)) mudarCamada(Number(id.slice(7)), { oculto: true })
    else if (id.startsWith('emoji:')) mudarSlide((s) => ({ ...s, emojis: s.emojis.filter((_, i) => i !== Number(id.slice(6))) }))
    else mudarEst(id, { oculto: true })
    setSelecionado(null)
  }

  const editarNaArte = e => {
    const canvas = node.current
    let elemento = e.target.closest('[data-elemento]')
    let campo
    if (cartao) {
      const raiz = canvas.querySelector('.kc')
      elemento = e.target
      while (elemento && elemento.parentElement !== raiz) elemento = elemento.parentElement
      if (!elemento) return
      const indice = [...raiz.children].indexOf(elemento)
      const campos = camposDaCamada(def, arte, indice)
      const valores = textosDe(def, arte)
      const trecho = e.target.textContent.trim()
      campo = campos.find(c => valores[c.id]?.replaceAll('*', '').includes(trecho)) || campos[0]
      if (!campo) return
      campo = { id: campo.id, valor: valores[campo.id] || '', cartao: true }
    } else {
      const id = elemento?.dataset.elemento
      if (!NOMES_BLOCO[id]) return
      campo = { id, valor: arte[id] || '', cartao: false }
    }
    const rect = elemento.getBoundingClientRect()
    const bounds = canvas.getBoundingClientRect()
    const x = Math.max(0, rect.left - bounds.left)
    const y = Math.max(0, Math.min(rect.top - bounds.top, bounds.height - 100))
    encerrarGrupo('pointer')
    setEdicao({ ...campo, x, y, largura: Math.min(Math.max(rect.width, 180), bounds.width - x), altura: Math.max(100, Math.min(rect.height + 24, bounds.height - y)), fonte: Math.max(16, Math.min(36, parseFloat(getComputedStyle(e.target).fontSize) * escala)) })
  }
  const voltarEdicao = () => { desfazer(); setSelecionado(null); setAnterior(null) }
  const repetirEdicao = () => { refazer(); setSelecionado(null); setAnterior(null) }
  useEffect(() => {
    const encerrar = () => { encerrarGrupo('pointer'); setGuias([]) }
    window.addEventListener('pointerup', encerrar)
    window.addEventListener('pointercancel', encerrar)
    return () => {
      window.removeEventListener('pointerup', encerrar)
      window.removeEventListener('pointercancel', encerrar)
    }
  }, [encerrarGrupo])

  useEffect(() => {
    const tecla = (e) => {
      const digitando = e.target.closest('textarea, input:not([type="range"]):not([type="checkbox"]), [contenteditable="true"]')
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !digitando && !galeria && !bancoAberto && !ocupado && carregado) {
        const key = e.key.toLowerCase()
        if (key === 'z' || key === 'y') {
          e.preventDefault()
          if (key === 'y' || e.shiftKey) repetirEdicao()
          else voltarEdicao()
          return
        }
      }
      if (!selecionado || galeria || bancoAberto || ocupado || !['Delete', 'Backspace'].includes(e.key) || e.target.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      apagarElemento(selecionado)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const trocarTemplate = (id) => {
    // Texto que ainda é o exemplo do template antigo dá lugar ao exemplo do novo; texto escrito por ela fica.
    const proprio = (s, k) => (s[k] !== TEMPLATES[s.template].padrao[k] ? { [k]: s[k] } : {})
    setAnterior(projeto)
    mudarSlide((s) => {
      const c = conteudoProprio(s)
      return novoSlide(id, { conteudo: c, ...(c.titulo != null && { titulo: c.titulo }), ...(c.texto != null && { texto: c.texto }), ...proprio(s, 'detalhe'), foto: s.foto, recorte: s.recorte, fotoX: s.fotoX, fotoY: s.fotoY, fotoZoom: s.fotoZoom, fotoDX: s.fotoDX, fotoDY: s.fotoDY, fotoCorte: s.fotoCorte })
    })
    setSelecionado(null)
    if (TEMPLATES[id].recorta && arte.foto && !arte.recorte) gerarRecorte(arte.foto)
  }
  const alinharMovimento = (elemento, dx, dy) => {
    if (!guiasAtivas || !elemento || !node.current) return { dx, dy }
    const bounds = node.current.getBoundingClientRect()
    const rect = el => { const r = el.getBoundingClientRect(); return { x: (r.left - bounds.left) / escala, y: (r.top - bounds.top) / escala, w: r.width / escala, h: r.height / escala } }
    const atual = rect(elemento)
    const elementos = cartao ? [...node.current.querySelector('.kc').children] : [...node.current.querySelectorAll('[data-elemento]')]
    const outros = elementos.filter(el => el !== elemento && getComputedStyle(el).visibility !== 'hidden').map(rect).filter(r => r.w && r.h && r.w * r.h < w * h * 0.9)
    const ajuste = encaixarBloco({ ...atual, x: atual.x + dx, y: atual.y + dy }, outros, w, h)
    setGuias(ajuste.linhas)
    return { dx: ajuste.x - atual.x, dy: ajuste.y - atual.y }
  }
  const mover = (chave, x, y) => {
    if (chave !== 'foto') {
      const pos = chave.startsWith('emoji:') ? arte.emojis[Number(chave.slice(6))] : arte.pos[chave]
      if (pos) {
        const d = alinharMovimento(node.current?.querySelector(`[data-elemento="${chave}"]`), x - pos.x, y - pos.y)
        x = Math.round(pos.x + d.dx); y = Math.round(pos.y + d.dy)
      }
    }
    mudarSlide(s => {
      if (chave === 'foto') return { ...s, fotoDX: x, fotoDY: y }
      if (chave.startsWith('emoji:')) return { ...s, emojis: s.emojis.map((e, j) => j === Number(chave.slice(6)) ? { ...e, x, y } : e) }
      return { ...s, pos: { ...s.pos, [chave]: { x, y } } }
    })
  }
  const moverCamada = (i, dx, dy) => {
    const c = arte.camadas?.[i] || {}
    const d = alinharMovimento(node.current?.querySelector('.kc')?.children[i], dx - (c.dx || 0), dy - (c.dy || 0))
    mudarCamada(i, { dx: (c.dx || 0) + d.dx, dy: (c.dy || 0) + d.dy })
  }

  const gerarRecorte = async (foto) => {
    setOcupado('Recortando a pessoa da foto…')
    setAviso('')
    try {
      const recorte = await recortarPessoa(foto)
      setProjeto((p) => ({ ...p, slides: p.slides.map((s) => (s.foto === foto ? { ...s, recorte } : s)) }))
    } catch (err) {
      setAviso(`Não consegui recortar a foto: ${err?.message ?? err}`)
    } finally {
      setOcupado('')
    }
  }

  // Card "texto atrás da cabeça": a foto nova precisa de um recorte novo da pessoa.
  const recortarCartao = async (slot, foto) => {
    setOcupado('Recortando a pessoa da foto…')
    setAviso('')
    try {
      const recorte = await recortarPessoa(foto)
      setProjeto((p) => ({ ...p, slides: p.slides.map((s) => (s.fotos?.[slot] === foto ? { ...s, fotos: { ...s.fotos, [`${slot}:recorte`]: recorte } } : s)) }))
    } catch (err) {
      setAviso(`Não consegui recortar a foto: ${err?.message ?? err}`)
    } finally {
      setOcupado('')
    }
  }
  const trocarFotoCartao = async (slot, origem) => {
    const foto = typeof origem === 'string' ? origem : await prepararFoto(origem)
    const cabeca = def.cabeca?.slot === slot
    mudarSlide((s) => ({ ...s, fotos: { ...s.fotos, [slot]: foto, ...(cabeca && { [`${slot}:recorte`]: '' }) } }))
    if (cabeca) recortarCartao(slot, foto)
  }
  const fotoOriginal = (slot) => mudarSlide((s) => {
    const fotos = { ...s.fotos }
    delete fotos[slot]
    delete fotos[`${slot}:recorte`]
    return { ...s, fotos }
  })

  // Recebe um arquivo/Blob (upload ou banco) ou um data URL (quadro de vídeo, já reduzido).
  const usarFoto = async (origem, slot = fotoAlvo) => {
    if (cartao) return trocarFotoCartao(slot ?? fotosDe(def)[0], origem)
    const foto = typeof origem === 'string' ? origem : await prepararFoto(origem)
    mudar({ foto, recorte: '', fotoX: 50, fotoY: 30, fotoZoom: 100, fotoDX: 0, fotoDY: 0, fotoCorte: {}, veu: arte.veu || 0.3 })
    setSelecionado('foto')
    if (TEMPLATES[arte.template].recorta) gerarRecorte(foto)
  }
  const escolherFoto = (slot) => (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) usarFoto(f, slot)
  }
  const abrirBanco = (slot = null) => { setFotoAlvo(slot); setBancoAberto(true) }

  const papelLayout = (s, i, total, informado) => {
    if (['capa', 'explicacao', 'conversa', 'lista', 'fechamento'].includes(informado)) return informado
    if (s.template === 'chat' || (ehCartao(s) && CARTAO[s.cartao].categoria === 'baloes')) return 'conversa'
    return i === 0 ? 'capa' : i === total - 1 ? 'fechamento' : 'explicacao'
  }
  const renderLayout = (s, f = formato, numero = contadorDe(atual)) => <Canvas arte={s} formato={f} contador={numero} interativo={false} grao={false} />
  const sugerirLayouts = async () => {
    const origem = arte
    const indice = atual
    setAnalisandoLayout(indice)
    try {
      const resultado = await avaliarLayouts(origem, { formato: cartao ? formatoDe(def) : formato, papel: papelLayout(origem, indice, slides.length), anteriores: slides.slice(Math.max(0, indice - 2), indice).map(idLayout) }, s => renderLayout(s))
      setSugestoes(prev => ({ ...prev, [indice]: { origem, ...resultado } }))
    } catch {
      setAviso('Não consegui conferir os layouts. Sua arte foi mantida; tente novamente.')
    } finally { setAnalisandoLayout(null) }
  }
  const aplicarSugestao = (opcao) => {
    if (sugestoes[atual]?.origem !== arte) return
    mudarSlide(() => opcao.slide)
    setSugestoes(prev => ({ ...prev, [atual]: { ...prev[atual], origem: opcao.slide, problemas: [] } }))
    setSelecionado(null)
  }

  const aplicarPedido = async (resposta, pedido = '') => {
    const antes = projetoAtual.current
    const foto = cartao ? arte.fotos?.[fotosDe(def)[0]] || '' : arte.foto
    const novo = montarProjeto(resposta, foto)
    setOcupado('Conferindo os layouts…')
    setAviso('')
    try {
      const precisaRecorte = foto && novo.slides.some(s => ehCartao(s) ? CARTAO[s.cartao].cabeca && Object.values(s.fotos).includes(foto) : TEMPLATES[s.template]?.recorta && s.foto)
      if (precisaRecorte) {
        try {
          const recorte = await recortarPessoa(foto)
          novo.slides = novo.slides.map(s => {
            if (!ehCartao(s)) return s.foto === foto ? { ...s, recorte } : s
            const slot = CARTAO[s.cartao].cabeca?.slot
            return slot && s.fotos[slot] === foto ? { ...s, fotos: { ...s.fotos, [`${slot}:recorte`]: recorte } } : s
          })
        } catch { setAviso('Não consegui recortar a pessoa. Confira a foto antes de exportar.') }
      }
      const resultados = {}
      const usados = []
      const normal = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      const explicito = CATALOGO_LAYOUTS.find(c => normal(pedido).includes(normal(c.nome)))?.id || ''
      for (let i = 0; i < novo.slides.length; i++) {
        setOcupado(`Conferindo layout ${i + 1} de ${novo.slides.length}…`)
        const original = novo.slides[i]
        const resultado = await avaliarLayouts(original, { formato: novo.formato, papel: papelLayout(original, i, novo.slides.length, resposta.slides?.[i]?.papel), anteriores: usados.slice(-2), preferido: explicito, permitirFotoReferencia: !/sem fotos?|s[oó] (?:com )?textos?|apenas textos?/i.test(pedido) }, s => renderLayout(s, novo.formato, novo.contador ? `${i + 1}/${novo.slides.length}` : ''))
        if (!resultado.opcoes.length) throw new Error(`Não foi possível diagramar o slide ${i + 1} sem sobreposição ou cortes. Divida o conteúdo em mais slides ou reduza o texto. Sua arte anterior foi mantida.`)
        const escolhido = resultado.opcoes[0].slide
        novo.slides[i] = escolhido
        resultados[i] = { ...resultado, origem: escolhido, problemas: resultado.opcoes.length ? [] : resultado.problemas }
        usados.push(idLayout(escolhido))
      }
      if (projetoAtual.current !== antes) {
        setAviso('A arte mudou durante a conferência. Mantive suas alterações; gere novamente quando terminar de editar.')
        return
      }
      setAnterior(antes)
      setProjeto(novo)
      setSugestoes(resultados)
      setSelecionado(null)
    } finally { setOcupado('') }
  }
  const desfazerPedido = () => { setProjeto(anterior); setAnterior(null); setSelecionado(null) }

  // Slides vindos de um gerador do Content: a IA só diagrama, o texto fica como veio.
  useEffect(() => {
    if (!carregado) return
    const entrada = pegarEntrada()
    if (!entrada) return
    setOcupado(`Montando o carrossel que veio do ${entrada.origem}…`)
    setAviso('')
    pedirArte(pedidoDeSlides(entrada.slides))
      .then(resposta => fixarTextos(resposta, entrada.slides), () => ({
        slides: entrada.slides.map(s => ({ template: 'corCheia', titulo: s.titulo, texto: s.texto })),
      }))
      .then(resposta => aplicarPedido(resposta))
      .catch(err => setAviso(err?.message || 'Não foi possível diagramar os slides. Sua arte anterior foi mantida.'))
      .finally(() => setOcupado(''))
  }, [carregado]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- galeria de modelos ----------
  const itensGaleria = useMemo(() => [
    ...CARTOES.map((k) => ({
      id: `cartao:${k.id}`, nome: k.nome, categoria: k.categoria, categoriaNome: CATEGORIAS[k.categoria], w: k.w, h: k.h,
      formato: formatoDe(k), comFoto: fotosDe(k).length > 0, busca: k.campos.map((c) => c.padrao).join(' '),
    })),
    ...Object.entries(TEMPLATES).map(([k, t]) => ({
      id: k, nome: t.nome, categoria: 'base', categoriaNome: 'Base do Studio', ...FORMATOS.feed,
      formato: 'feed', comFoto: BASE_COM_FOTO.includes(k), busca: `${t.padrao.titulo} ${t.padrao.texto}`,
    })),
  ], [])
  const renderMini = (item) =>
    item.id.startsWith('cartao:')
      ? <Canvas arte={novoCartao(item.id.slice(7))} formato="feed" interativo={false} grao={false} />
      : <Canvas arte={novoSlide(item.id)} formato="feed" interativo={false} />

  const aplicarModelo = (id, modo) => {
    let novo = id.startsWith('cartao:') ? novoCartao(id.slice(7)) : novoSlide(id)
    if (modo === 'atual') {
      // O texto e a foto sempre vão junto; só posições e ajustes finos ficam para trás, então só aí ela é avisada.
      if (temAjustes(arte) && !window.confirm('Trocar o modelo deste slide? Seu título, seu texto e a foto vão para o novo modelo. As posições e ajustes que você fez neste modelo ficam para trás. Dá para voltar com "Voltar para a arte anterior".')) return
      novo = levarConteudo(arte, novo)
    }
    setAnterior(projeto)
    setProjeto((p) => (modo === 'novo'
      ? { ...p, slides: [...p.slides.slice(0, p.atual + 1), novo, ...p.slides.slice(p.atual + 1)], atual: p.atual + 1 }
      : { ...p, slides: p.slides.map((s, i) => (i === p.atual ? novo : s)) }))
    setSelecionado(null)
    setGaleria(false)
    if (!ehCartao(novo) && TEMPLATES[novo.template].recorta && novo.foto && !novo.recorte) gerarRecorte(novo.foto)
    if (ehCartao(novo) && CARTAO[novo.cartao].cabeca) {
      const slot = CARTAO[novo.cartao].cabeca.slot
      if (novo.fotos[slot] && !novo.fotos[`${slot}:recorte`]) recortarCartao(slot, novo.fotos[slot])
    }
  }

  // Slides
  const irPara = (i) => { navegar((p) => ({ ...p, atual: i })); setSelecionado(null) }
  const adicionar = () => setProjeto((p) => ({ ...p, slides: [...p.slides, padraoDe(p.slides[p.atual])], atual: p.slides.length }))
  const duplicar = () => setProjeto((p) => ({ ...p, slides: [...p.slides.slice(0, p.atual + 1), structuredClone(p.slides[p.atual]), ...p.slides.slice(p.atual + 1)], atual: p.atual + 1 }))
  const apagar = () => setProjeto((p) => (p.slides.length < 2 ? p : { ...p, slides: p.slides.filter((_, i) => i !== p.atual), atual: Math.max(0, p.atual - 1) }))
  const mudarOrdem = (d) => setProjeto((p) => {
    const j = p.atual + d
    if (j < 0 || j >= p.slides.length) return p
    const s = [...p.slides];
    [s[p.atual], s[j]] = [s[j], s[p.atual]]
    return { ...p, slides: s, atual: j }
  })

  const renderProjeto = (p, slide, i) => <Canvas arte={slide} formato={p.formato} contador={p.contador && p.slides.length > 1 ? `${i + 1}/${p.slides.length}` : ''} interativo={false} />
  const baixarRevisao = async r => {
    if (!mesmaArte(projetoAtual.current, r.origem)) { setAviso('A arte mudou. Revise novamente antes de baixar.'); return }
    setOcupado('Preparando download…')
    try {
      const arquivo = await gerarDownload(r.origem, r.indices, (s, i) => renderProjeto(r.origem, s, i), r.zip, setOcupado)
      const url = URL.createObjectURL(arquivo.blob)
      const link = document.createElement('a'); link.href = url; link.download = arquivo.nome; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch { setAviso('Não foi possível exportar. Confira as imagens e tente novamente; sua arte foi mantida.') }
    finally { setOcupado('') }
  }
  const revisarExportacao = async (indices, zip = true, automatico = true) => {
    const origem = projetoAtual.current
    indices = [...new Set(indices)].filter(i => i >= 0 && i < origem.slides.length).sort((a, b) => a - b)
    if (!indices.length) { setAviso('Selecione pelo menos um card para revisar.'); return }
    setOcupado('Revisando textos e diagramação…'); setAviso(''); setSelecionado(null)
    try {
      const cards = await revisarCards(origem, indices, (s, i) => renderProjeto(origem, s, i))
      const resultado = { origem, indices, zip, cards }
      setRevisao(resultado)
      if (automatico && cards.every(c => !c.problemas.length)) await baixarRevisao(resultado)
    } catch { setAviso('Não foi possível concluir a revisão. Tente novamente antes de baixar.') }
    finally { setOcupado('') }
  }
  const corrigirRevisao = async i => {
    const origem = projetoAtual.current
    setOcupado(`Conferindo alternativas para o card ${i + 1}…`)
    try {
      const resultado = await avaliarLayouts(origem.slides[i], { formato: origem.formato, papel: papelLayout(origem.slides[i], i, origem.slides.length) }, s => renderProjeto(origem, s, i))
      if (projetoAtual.current !== origem) return
      navegar(p => ({ ...p, atual: i }))
      setSugestoes(prev => ({ ...prev, [i]: { ...resultado, origem: origem.slides[i] } }))
      setAviso('Confira as sugestões de layout no painel. Depois de aplicar uma opção, revise novamente; cores podem precisar de ajuste manual.')
    } catch { setAviso('Não foi possível sugerir ajustes. O card foi mantido.') }
    finally { setOcupado('') }
  }
  const exportarAtual = () => revisarExportacao([atual], false)
  const exportarTodos = () => revisarExportacao(slides.map((_, i) => i), true)

  const est = selecionado ? arte.est?.[selecionado] ?? {} : {}
  const tamanhoPadrao = { titulo: 100, texto: 40, detalhe: 46 }
  const emojiSelecionado = selecionado?.startsWith('emoji:') ? arte.emojis[Number(selecionado.slice(6))] : null
  const camadaSel = ehCamada(selecionado) ? Number(selecionado.slice(7)) : -1
  const camada = camadaSel >= 0 ? arte.camadas?.[camadaSel] ?? {} : {}
  const elCamada = camadaSel >= 0 ? node.current?.querySelector('.kc')?.children[camadaSel] : null
  const camadasOcultas = cartao ? Object.entries(arte.camadas ?? {}).filter(([, c]) => c.oculto).map(([i]) => Number(i)) : []
  const fotosCartao = cartao ? fotosDe(def) : []

  // Lista com todos os modelos: trocar aqui leva o título, o texto e a foto do slide para o modelo escolhido.
  const trocarPelaLista = (id) => (!cartao && id in TEMPLATES ? trocarTemplate(id) : aplicarModelo(id, 'atual'))
  const seletorModelo = (
    <select value={cartao ? `cartao:${arte.cartao}` : arte.template} onChange={(e) => trocarPelaLista(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" aria-label="Template">
      {Object.entries(CATEGORIAS).map(([cat, nome]) => (
        <optgroup key={cat} label={nome}>
          {CARTOES.filter((k) => k.categoria === cat).map((k) => <option key={k.id} value={`cartao:${k.id}`}>{k.nome}</option>)}
        </optgroup>
      ))}
      <optgroup label="Base do Studio">
        {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}
      </optgroup>
    </select>
  )

  // Miniaturas de todos os modelos já com o título, o texto e a foto deste slide.
  const modeloAtual = cartao ? `cartao:${arte.cartao}` : arte.template
  const categoriaAtual = catVisual ?? (cartao ? def.categoria : 'base')
  const arteAdiada = useDeferredValue(arte)
  const previas = useMemo(() => itensGaleria
    .filter((it) => categoriaAtual === 'todas' || it.categoria === categoriaAtual)
    .map((it) => ({ it, slide: aliviar(levarConteudo(arteAdiada, it.id.startsWith('cartao:') ? novoCartao(it.id.slice(7)) : novoSlide(it.id))) })),
  [itensGaleria, categoriaAtual, arteAdiada])
  const chipVisual = (ativo) => `shrink-0 px-2.5 py-1 rounded-full text-xs border ${ativo ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`
  const seletorVisual = (
    <div className="rounded-xl border border-gray-200 p-3 space-y-2" aria-label="Modelos com o seu texto">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900">Modelos com o seu texto</span>
        <span className="text-xs text-gray-500">{previas.length} {previas.length === 1 ? 'modelo' : 'modelos'}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button type="button" className={chipVisual(categoriaAtual === 'todas')} onClick={() => setCatVisual('todas')}>Todos</button>
        {Object.entries({ ...CATEGORIAS, base: 'Base do Studio' }).map(([k, nome]) => (
          <button key={k} type="button" className={chipVisual(categoriaAtual === k)} onClick={() => setCatVisual(k)}>{nome}</button>
        ))}
      </div>
      <div className="grid gap-2 max-h-80 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
        {previas.map(({ it, slide }) => {
          const t = tamanho(slide, 'feed')
          const k = 92 / t.w
          return (
            <button key={it.id} type="button" data-escolha={it.id} onClick={() => trocarPelaLista(it.id)} title={it.nome} className="text-left group" style={{ contentVisibility: 'auto', containIntrinsicSize: '92px 140px' }}>
              <div className={`rounded-md overflow-hidden ring-1 ${it.id === modeloAtual ? 'ring-2 ring-orange-500' : 'ring-gray-200 group-hover:ring-orange-300'}`} style={{ width: 92, height: t.h * k }}>
                <div style={{ transform: `scale(${k})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                  <Canvas arte={slide} formato="feed" interativo={false} grao={false} />
                </div>
              </div>
              <span className="block mt-1 text-[11px] leading-tight text-gray-700 line-clamp-2">{it.nome}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const painelEmojis = (
    <Campo rotulo="Emojis (clique para adicionar e arraste na arte)">
      <div className="flex flex-wrap gap-1 mb-2 max-h-28 overflow-y-auto">
        {EMOJIS.map((cod) => (
          <button key={cod} type="button" onClick={() => mudar({ emojis: [...arte.emojis, { cod, x: w / 2 - 50, y: h / 2 - 50, tam: 100 }] })} className="w-8 h-8 rounded-md border border-gray-200 hover:bg-gray-50 p-0.5">
            <img src={emojiUrl(cod)} alt="" className="w-full h-full" />
          </button>
        ))}
      </div>
      {arte.emojis.map((e, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <img src={emojiUrl(e.cod)} alt="" className="w-5 h-5" />
          <input type="range" min={40} max={260} value={e.tam} onChange={(ev) => mudar({ emojis: arte.emojis.map((x, j) => (j === i ? { ...x, tam: Number(ev.target.value) } : x)) })} className="flex-1" />
          <input type="range" min={-30} max={30} value={e.giro ?? 0} onChange={(ev) => mudar({ emojis: arte.emojis.map((x, j) => (j === i ? { ...x, giro: Number(ev.target.value) } : x)) })} className="w-20" title="Girar" />
          <button type="button" onClick={() => mudar({ emojis: arte.emojis.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      ))}
    </Campo>
  )

  const camposSelecionados = useMemo(() => cartao && camadaSel >= 0 ? camposDaCamada(def, arte, camadaSel) : [], [cartao, def, arte.textos, camadaSel]) // eslint-disable-line react-hooks/exhaustive-deps
  const idsSelecionados = new Set(camposSelecionados.map((c) => c.id))
  const renderCampoTexto = (c, compacto = false) => {
    const valor = textosDe(def, arte)[c.id] ?? ''
    return (
      <Campo key={c.id} rotulo={c.rotulo}>
        <textarea rows={Math.min(4, Math.max(1, valor.split('\n').length + (valor.length > 60 ? 1 : 0)))} value={valor} onChange={(e) => mudarTexto(c.id, e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" data-campo={c.id} />
        {c.ajuda && <span className="block text-xs text-gray-400 mt-0.5">{c.ajuda}</span>}
        {def.camadasTexto?.[c.id] != null && (
          <span className="block mt-2 space-y-1">
            <span className="block text-xs text-gray-600">Sobreposição com a pessoa recortada</span>
            <select aria-label={`${c.rotulo}: sobreposição`} value={arte.camadas?.[def.camadasTexto[c.id]]?.plano ?? ''} onChange={(e) => mudarCamada(def.camadasTexto[c.id], { plano: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm">
              <option value="">Ordem do modelo</option>
              <option value="atras">Atrás da pessoa</option>
              <option value="frente">Na frente da pessoa</option>
            </select>
            {!compacto && <button type="button" onClick={() => setSelecionado(`camada:${def.camadasTexto[c.id]}`)} className="min-h-11 text-xs text-orange-700 underline">Selecionar este texto na arte</button>}
          </span>
        )}
      </Campo>
    )
  }
  const camposTextoCartao = cartao ? def.campos.map((c) => renderCampoTexto(c)) : null

  return (
    <div className="p-6 animate-fade-in"
      onPointerDownCapture={(e) => { if (e.target.closest('[data-canvas="editor"], input[type="range"]')) iniciarGrupo('pointer') }}
      onFocusCapture={(e) => { if (e.target.matches('textarea, input[type="text"]')) iniciarGrupo('texto') }}
      onBlurCapture={(e) => { if (e.target.matches('textarea, input[type="text"]')) encerrarGrupo('texto') }}
    >
      <ArtesSalvas onVincular={(id, nome, origem) => navegar(p => mesmaArte(p, origem) ? { ...p, bibliotecaId: id, nomeArte: nome } : p)} projeto={projeto} bloqueado={!carregado || !!ocupado} onAbrir={p => {
        encerrarGrupo('texto'); encerrarGrupo('pointer')
        setProjeto(p); setSelecionado(null); setAnterior(null); setSugestoes({}); setAviso('')
      }} onLimpar={() => {
        encerrarGrupo('texto'); encerrarGrupo('pointer')
        setProjeto({ ...PROJETO_INICIAL, slides: [novoSlide('corCheia', { titulo: '', texto: '', detalhe: '', foto: '', recorte: '', emojis: [] })] })
        setSelecionado(null); setAnterior(null); setSugestoes({}); setAviso('')
      }} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex gap-2" role="group" aria-label="Histórico de edição">
          <button type="button" onClick={voltarEdicao} disabled={!podeDesfazer || !carregado || !!ocupado} title="Desfazer (Ctrl+Z / ⌘Z)" className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40"><Undo2 size={16} />Desfazer</button>
          <button type="button" onClick={repetirEdicao} disabled={!podeRefazer || !carregado || !!ocupado} title="Refazer (Ctrl+Shift+Z / Ctrl+Y)" className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40"><Redo2 size={16} />Refazer</button>
        </div>
        <div className="flex flex-wrap gap-2">

          <button type="button" onClick={exportarAtual} disabled={!!ocupado} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-60"><Download size={15} />Baixar este</button>
          <button type="button" onClick={exportarTodos} disabled={!!ocupado} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"><Download size={15} />Baixar todos ({slides.length})</button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-5">Dê dois cliques ou dois toques no texto para editar na arte. Enter quebra a linha; clique fora para concluir. Arraste para reposicionar.</p>

      <details className="mb-4 rounded-xl border border-orange-200 bg-orange-50/30 p-3">
        <summary className="cursor-pointer text-sm font-semibold min-h-8">Criar com IA · descrever uma nova arte</summary>
        <div className="mt-3"><Pedido onResposta={aplicarPedido} desfazer={anterior ? desfazerPedido : null} /></div>
      </details>
      {bancoAberto && <Banco onFechar={() => setBancoAberto(false)} onEscolher={(origem) => { setBancoAberto(false); usarFoto(origem) }} />}
      {galeria && <Galeria itens={itensGaleria} categorias={{ ...CATEGORIAS, base: 'Base do Studio' }} renderMini={renderMini} onFechar={() => setGaleria(false)} onAplicar={aplicarModelo} />}

      {(ocupado || aviso) && (
        <div className={`mb-4 flex items-center gap-2 text-sm ${aviso ? 'text-red-600' : 'text-gray-600'}`}>
          {ocupado && <Loader2 size={15} className="animate-spin" />}{ocupado || aviso}
        </div>
      )}

      <VisaoGeral key={slides.length + ':' + (projeto.bibliotecaId || '')} projeto={projeto} bloqueado={!!ocupado} renderizar={(s, i) => renderProjeto(projeto, s, i)} tamanho={s => tamanho(s, formato)} onAbrir={i => { irPara(i); node.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} onReordenar={(de, para) => setProjeto(p => reordenarProjeto(p, de, para))} onLote={(indices, ajustes) => { setProjeto(p => aplicarEmLote(p, indices, ajustes)); setAviso('Ajustes aplicados. Revise o carrossel antes de exportar.'); }} onExportar={indices => revisarExportacao([...indices].sort((a, b) => a - b), true)} />
      <RevisaoFinal revisao={revisao} atual={projeto} bloqueado={!!ocupado} onAbrir={irPara} onCorrigir={corrigirRevisao} onRevisar={() => revisarExportacao(revisao.indices, revisao.zip, false)} onBaixar={() => baixarRevisao(revisao)} />
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <label className="flex gap-2 items-center"><input type="checkbox" checked={guiasAtivas} onChange={e => { setGuiasAtivas(e.target.checked); setGuias([]) }} />Guias e alinhamento automático</label>
        <button className="text-orange-800 underline" disabled={!!ocupado} onClick={() => revisarExportacao(slides.map((_, i) => i), true, false)}>Revisar carrossel</button>
        <span>Baixar todos gera um ZIP com os cards em ordem.</span>
      </div>
      {/* Slides do carrossel */}
      <div className="flex items-end gap-3 mb-5 overflow-x-auto pb-2">
        {slides.map((s, i) => {
          const t = tamanho(s, formato)
          return (
            <button key={i} type="button" onClick={() => irPara(i)} className={`shrink-0 rounded-lg overflow-hidden border-2 ${i === atual ? 'border-orange-500' : 'border-transparent hover:border-gray-300'}`} style={{ width: t.w * 0.08, height: t.h * 0.08 }}>
              <div style={{ transform: 'scale(0.08)', transformOrigin: 'top left', pointerEvents: 'none' }}>
                <Canvas arte={s} formato={formato} contador={contadorDe(i)} interativo={false} grao={false} />
              </div>
            </button>
          )
        })}
        <div className="flex flex-col gap-1">
          <button type="button" onClick={adicionar} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"><Plus size={13} />Novo slide</button>
          <button type="button" onClick={duplicar} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"><Copy size={13} />Duplicar</button>
          <div className="flex gap-1">
            <button type="button" aria-label="Mover card para antes" onClick={() => mudarOrdem(-1)} className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">←</button>
            <button type="button" aria-label="Mover card para depois" onClick={() => mudarOrdem(1)} className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">→</button>
            <button type="button" aria-label="Apagar card atual" onClick={apagar} disabled={slides.length < 2} className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-red-50 disabled:opacity-40"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="relative shrink-0 rounded-xl border border-gray-200" style={{ width: w * escala, height: h * escala }} onDoubleClick={editarNaArte} onKeyDown={e => {
          if (e.key !== 'Enter' || e.target.matches('input, textarea, button, select') || !selecionado) return
          const target = cartao ? node.current?.querySelector('.kc')?.children[camadaSel] : node.current?.querySelector(`[data-elemento="${selecionado}"]`)
          if (target) { e.preventDefault(); editarNaArte({ target }) }
        }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left' }}>
            <Canvas arte={arte} formato={formato} contador={contadorDe(atual)} escala={escala} onMover={mover} onMoverCamada={moverCamada} onSelecionar={setSelecionado} selecionado={selecionado} nodeRef={node} />
          </div>
          {guiasAtivas && <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute border border-dashed border-cyan-500/40" style={{ inset: 64 * escala }} />
            {guias.map((g, i) => <div key={i} className="absolute border-cyan-500" style={g.eixo === 'x' ? { left: g.valor * escala, top: 0, bottom: 0, borderLeftWidth: 1 } : { top: g.valor * escala, left: 0, right: 0, borderTopWidth: 1 }}>{g.iguais && <span className="bg-white text-cyan-800 text-xs">Espaços iguais</span>}</div>)}
          </div>}
          {edicao && <EdicaoNaArte key={`${atual}:${edicao.id}`} campo={edicao} onCancelar={() => setEdicao(null)} onConcluir={valor => {
            if (valor !== edicao.valor) {
              if (edicao.cartao) mudarTexto(edicao.id, valor)
              else mudar({ [edicao.id]: valor })
            }
            setEdicao(null)
          }} />}
        </div>

        <div className="flex-1 w-full min-w-0 lg:max-w-sm flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[85vh] lg:overflow-y-auto">
          <details className="rounded-xl border border-gray-200 p-3" open>
            <summary className="text-sm font-semibold cursor-pointer mb-2">Modelo e imagens</summary>
        {/* Todas as fontes de imagem ficam junto ao modelo. */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setGaleria(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800"><LayoutGrid size={15} />Modelos de arte ({itensGaleria.length})</button>
          {!cartao && <label className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <ImagePlus size={15} />{cartao || arte.foto ? 'Trocar foto' : 'Colocar foto'}
            <input type="file" accept="image/*" onChange={escolherFoto(null)} className="hidden" />
          </label>}
          {!cartao && <button type="button" onClick={() => abrirBanco(null)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><Images size={15} />Do meu banco</button>}
          {!cartao && arte.foto && <button type="button" onClick={() => mudar({ foto: '', recorte: '' })} className="flex items-center gap-1 px-2 text-sm text-gray-500 hover:text-red-600"><Trash2 size={14} />Tirar foto</button>}
        </div>
              {fotosCartao.length > 0 && (
                <Campo rotulo={fotosCartao.length > 1 ? `Fotos (${fotosCartao.length})` : 'Foto'}>
                  <div className="space-y-2">
                    {fotosCartao.map((slot, i) => (
                      <div key={slot} className="flex items-center gap-2">
                        <span className="w-10 h-12 rounded-md bg-cover bg-center border border-gray-200 shrink-0" style={{ backgroundImage: `url('${urlFoto(def, arte, slot)}')` }} />
                        <span className="text-xs text-gray-500 w-12 shrink-0">Foto {i + 1}</span>
                        <label className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">Trocar<input type="file" accept="image/*" onChange={escolherFoto(slot)} className="hidden" /></label>
                        <button type="button" onClick={() => abrirBanco(slot)} className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">Do banco</button>
                        {arte.fotos?.[slot] && <button type="button" onClick={() => fotoOriginal(slot)} className="text-xs text-gray-500 hover:underline">Original</button>}
                      </div>
                    ))}
                  </div>
                  {def.cabeca && <span className="block text-xs text-gray-400 mt-1">Ao trocar a foto, o Studio recorta a pessoa de novo para a palavra ficar atrás da cabeça.</span>}
                </Campo>
              )}
          </details>
          <details className="rounded-xl border border-gray-200 p-3">
            <summary className="text-sm cursor-pointer">Restaurar diagramação</summary>
            <div className="mt-2">          <button type="button" onClick={() => { mudarSlide((s) => (ehCartao(s) ? { ...s, camadas: {} } : { ...s, pos: TEMPLATES[s.template].padrao.pos, est: {} })); setSelecionado(null) }} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><RotateCcw size={15} />Posições padrão</button></div>
          </details>
          <SugestoesLayout arte={arte} resultado={sugestoes[atual]} analisando={analisandoLayout != null || !!ocupado} onAnalisar={sugerirLayouts} onAplicar={aplicarSugestao} renderizar={s => renderLayout(s)} tamanho={s => tamanho(s, formato)} />
          {!cartao && <details className="rounded-xl border border-gray-200 p-3 space-y-2" aria-label="Elementos da arte">
            <summary className="text-sm font-semibold cursor-pointer">Elementos da arte · adicionar ou restaurar texto</summary>
            {Object.entries(NOMES_BLOCO).map(([id, nome]) => (
              <div key={id} className="flex items-center gap-2">
                <button type="button" onClick={() => setSelecionado(id)} className={`flex-1 text-left text-sm rounded px-2 py-1 ${selecionado === id ? 'bg-orange-100 text-orange-800' : 'hover:bg-gray-50'}`}>{nome}{arte.est?.[id]?.oculto ? ' (apagado)' : !arte[id] ? ' (vazio)' : ''}</button>
                {arte.est?.[id]?.oculto ? <button type="button" onClick={() => { mudarEst(id, { oculto: false }); setSelecionado(id) }} className="text-xs text-orange-700">Restaurar {nome.toLowerCase()}</button> : <button type="button" aria-label={`Apagar ${nome.toLowerCase()}`} onClick={() => apagarElemento(id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            {['tarjas', 'caixa', 'selecao'].includes(arte.template) && <div className="flex items-center justify-between text-sm px-2 py-1"><span>Enfeites do template</span><button type="button" onClick={() => mudar({ semEnfeites: !arte.semEnfeites })} className="text-xs text-orange-700">{arte.semEnfeites ? 'Restaurar enfeites' : 'Apagar enfeites'}</button></div>}
            {arte.foto && <button type="button" onClick={() => setSelecionado('foto')} className={`block w-full text-left text-sm rounded px-2 py-1 ${selecionado === 'foto' ? 'bg-orange-100 text-orange-800' : 'hover:bg-gray-50'}`}>Foto · tamanho e corte</button>}
            {arte.emojis.map((e, i) => <div key={i} className="flex items-center gap-2"><button type="button" onClick={() => setSelecionado(`emoji:${i}`)} className="flex flex-1 items-center gap-2 text-sm px-2 py-1"><img src={emojiUrl(e.cod)} alt="" className="w-5 h-5" />Emoji {i + 1}</button><button type="button" aria-label={`Apagar emoji ${i + 1}`} onClick={() => apagarElemento(`emoji:${i}`)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button></div>)}
          </details>}

          {!cartao && arte.foto && (!selecionado || selecionado === 'foto') && (
            <div className="order-first rounded-xl border border-gray-200 p-4 space-y-3" aria-label="Editar foto">
              <h2 className="text-sm font-semibold">Foto · tamanho, posição e corte</h2>
              <Faixa rotulo="Tamanho da foto (%)" valor={arte.fotoZoom} min={10} max={400} onChange={(fotoZoom) => mudar({ fotoZoom })} />
              <div className="grid grid-cols-2 gap-3">
                <Faixa rotulo="Mover para os lados" valor={arte.fotoDX ?? 0} min={-w} max={w} passo={5} onChange={(fotoDX) => mudar({ fotoDX })} />
                <Faixa rotulo="Mover para cima/baixo" valor={arte.fotoDY ?? 0} min={-h} max={h} passo={5} onChange={(fotoDY) => mudar({ fotoDY })} />
              </div>
              <p className="text-xs text-gray-500">Corte as bordas sem perder a foto original.</p>
              <div className="grid grid-cols-2 gap-3">
                {[['topo', 'Cortar em cima (%)'], ['base', 'Cortar embaixo (%)'], ['esquerda', 'Cortar à esquerda (%)'], ['direita', 'Cortar à direita (%)']].map(([lado, nome]) => (
                  <Faixa key={lado} rotulo={nome} valor={arte.fotoCorte?.[lado] ?? 0} min={0} max={49} onChange={(v) => mudar({ fotoCorte: { ...arte.fotoCorte, [lado]: v } })} />
                ))}
              </div>
              <Faixa rotulo="Véu" valor={Math.round(arte.veu * 100)} min={0} max={60} onChange={(v) => mudar({ veu: v / 100 })} />
              {(arte.template === 'caixa' || arte.template === 'cabecaCaixa') && <Faixa rotulo="Onde a foto começa" valor={arte.corte} min={0} max={h - 100} passo={10} onChange={(corte) => mudar({ corte })} />}
              <div className="flex flex-wrap gap-3 text-xs">
                <button type="button" onClick={() => mudar({ fotoX: 50, fotoY: 30, fotoZoom: 100, fotoDX: 0, fotoDY: 0, fotoCorte: {} })} className="text-orange-700">Restaurar enquadramento</button>
                {TEMPLATES[arte.template].recorta && <button type="button" onClick={() => gerarRecorte(arte.foto)} disabled={!!ocupado} className="flex items-center gap-1"><Scissors size={14} />Recortar pessoa (remover fundo)</button>}
                <button type="button" onClick={() => apagarElemento('foto')} className="text-red-600">Apagar foto</button>
              </div>
            </div>
          )}

          {emojiSelecionado && <div className="rounded-xl border border-orange-200 p-4 space-y-3"><h2 className="text-sm font-semibold">Emoji selecionado</h2><Faixa rotulo="Tamanho do emoji" valor={emojiSelecionado.tam} min={20} max={400} onChange={(tam) => mudar({ emojis: arte.emojis.map((e, i) => i === Number(selecionado.slice(6)) ? { ...e, tam } : e) })} /><button type="button" onClick={() => apagarElemento(selecionado)} className="text-sm text-red-600">Apagar emoji</button><button type="button" onClick={() => setSelecionado(null)} className="ml-3 text-sm text-gray-500">Fechar</button></div>}
          {camadaSel >= 0 ? (
            <div className="order-first rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3" data-testid="painel-camada">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 truncate">{descreverCamada(elCamada)}</span>
                <button type="button" onClick={() => setSelecionado(null)} className="text-xs text-gray-500 hover:underline shrink-0">Fechar</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => apagarElemento(selecionado)} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} />Apagar da arte</button>
                <span className="text-xs text-gray-500">Ou pressione Delete após selecionar na arte.</span>
              </div>
              {camposSelecionados.length > 0 && <details className="space-y-2" aria-label="Texto selecionado"><summary className="text-xs cursor-pointer">Edição alternativa e sobreposição</summary>
                {camposSelecionados.map((c) => renderCampoTexto(c, true))}
              </details>}
              <Faixa rotulo="Tamanho (%)" valor={Math.round((camada.escala ?? 1) * 100)} min={20} max={300} onChange={(v) => mudarCamada(camadaSel, { escala: v / 100 })} />
              <Campo rotulo="Fonte">
                <select value={camada.fonte ?? ''} onChange={(e) => mudarCamada(camadaSel, { fonte: e.target.value || undefined })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                  <option value="">A do modelo</option>
                  {Object.entries(FONTES).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
                </select>
              </Campo>
              <details key={`ajustes:${arte.cartao}:${camadaSel}`} className="border-t border-orange-100 pt-2">
                <summary className="min-h-11 flex items-center justify-between text-sm text-gray-700 cursor-pointer">Mais ajustes · cor e corte<ChevronDown size={16} /></summary>
                <div className="space-y-3 pt-2">
              <Campo rotulo="Cor do texto">
                <div className="flex flex-wrap items-center gap-2">
                  <Cores valor={camada.cor} onChange={(cor) => mudarCamada(camadaSel, { cor })} />
                  {camada.cor && <button type="button" onClick={() => mudarCamada(camadaSel, { cor: undefined })} className="text-xs text-gray-500 hover:underline">A do modelo</button>}
                </div>
              </Campo>
              <details className="rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <summary className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer"><Scissors size={14} />Cortar</summary>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[['cima', 'Em cima'], ['baixo', 'Embaixo'], ['esq', 'Esquerda'], ['dir', 'Direita']].map(([k, r]) => (
                    <Faixa key={k} rotulo={r} valor={camada.corte?.[k] ?? 0} min={0} max={90} onChange={(v) => mudarCamada(camadaSel, { corte: { ...(camada.corte ?? {}), [k]: v } })} />
                  ))}
                </div>
                <button type="button" onClick={() => mudarCamada(camadaSel, { corte: undefined })} className="mt-2 text-xs text-gray-500 hover:underline">Desfazer corte</button>
              </details>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => mudarCamada(camadaSel, { dx: 0, dy: 0, escala: 1 })} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><RotateCcw size={14} />Voltar ao lugar</button>
              </div>
                </div>
              </details>
              {def.campos.length > camposSelecionados.length && <details key={`${arte.cartao}:${camadaSel}`} className="border-t border-orange-100 pt-2">
                <summary className="min-h-11 flex items-center justify-between text-sm text-orange-800 cursor-pointer">Outros textos do modelo ({def.campos.length - camposSelecionados.length})<ChevronDown size={16} /></summary>
                <div className="space-y-3 mt-2">{def.campos.filter((c) => !idsSelecionados.has(c.id)).map((c) => renderCampoTexto(c, true))}</div>
              </details>}
            </div>
          ) : cartao ? (
            <>
              <div className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate" data-testid="modelo-atual">{def.nome}</p>
                  <p className="text-xs text-gray-500">{CATEGORIAS[def.categoria]} · {formatoDe(def) === 'story' ? 'Story 9:16' : 'Feed 4:5'}</p>
                </div>
                <button type="button" onClick={() => setGaleria(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><LayoutGrid size={14} />Ver galeria</button>
              </div>
              {seletorVisual}
              <Campo rotulo="Template (pelo nome)">{seletorModelo}</Campo>
              <p className="text-xs text-gray-500">Clique em qualquer elemento da arte para mudar tamanho, fonte, cor, cortar ou apagar.</p>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={projeto.contador} onChange={(e) => mudarProjeto({ contador: e.target.checked })} />
                Numerar os slides (1/{slides.length}) em manuscrita
              </label>
              {camadasOcultas.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {camadasOcultas.length === 1 ? '1 elemento apagado' : `${camadasOcultas.length} elementos apagados`}
                  <button type="button" onClick={() => mudarSlide((s) => ({ ...s, camadas: Object.fromEntries(Object.entries(s.camadas).map(([i, c]) => [i, { ...c, oculto: false }])) }))} className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"><RotateCcw size={12} />Voltar todos</button>
                </div>
              )}

              <details><summary className="text-xs cursor-pointer">Textos ocultos ou vazios · edição alternativa</summary><div className="space-y-3 mt-3">{camposTextoCartao}</div></details>

              {painelEmojis}
            </>
          ) : selecionado && NOMES_BLOCO[selecionado] ? (
            <div className="order-first rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{NOMES_BLOCO[selecionado]}</span>
                <button type="button" onClick={() => setSelecionado(null)} className="text-xs text-gray-500 hover:underline">Fechar</button>
              </div>
              <details><summary className="text-xs cursor-pointer">Editar texto vazio ou oculto</summary><textarea rows={3} value={arte[selecionado]} onChange={(e) => mudar({ [selecionado]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></details>
                <Campo rotulo="Fonte">
                  <select value={est.fonte ?? (selecionado === 'titulo' || (selecionado === 'texto' && arte.template === 'atrasCabeca') ? arte.fonteTitulo : selecionado === 'detalhe' ? 'kinder' : 'inter')} onChange={(e) => mudarEst(selecionado, { fonte: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    {Object.entries(FONTES).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
                  </select>
                </Campo>
              {est.oculto ? <button type="button" onClick={() => mudarEst(selecionado, { oculto: false })} className="text-sm text-orange-700">Restaurar elemento</button> : <button type="button" onClick={() => apagarElemento(selecionado)} className="flex items-center gap-1 text-sm text-red-600"><Trash2 size={14} />Apagar elemento</button>}
              <Faixa rotulo="Tamanho" valor={est.tamanho ?? tamanhoPadrao[selecionado]} min={20} max={360} onChange={(tamanho) => mudarEst(selecionado, { tamanho })} />
              <Faixa rotulo="Largura do bloco" valor={est.largura ?? LARGURA_PADRAO[selecionado]} min={200} max={1040} passo={10} onChange={(largura) => mudarEst(selecionado, { largura })} />
              <div className="flex gap-1">
                {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([v, Icone]) => (
                  <button key={v} type="button" onClick={() => mudarEst(selecionado, { alinhar: v })} className={`p-2 rounded-lg border ${est.alinhar === v ? 'border-orange-500 bg-white' : 'border-gray-200'}`}><Icone size={15} /></button>
                ))}
              </div>
              <Campo rotulo="Cor do texto">
                <Cores valor={selecionado === 'titulo' ? arte.corTitulo : selecionado === 'texto' ? (arte.template === 'tarjas' ? est.cor ?? (arte.semEnfeites ? arte.corTexto : 'creme') : arte.corTexto) : arte.corDestaque} onChange={(c) => selecionado === 'texto' ? mudarSlide(s => ({ ...s, corTexto: c, est: { ...s.est, texto: { ...s.est?.texto, cor: c } } })) : mudar(selecionado === 'titulo' ? { corTitulo: c } : selecionado === 'texto' ? { corTexto: c } : { corDestaque: c })} />
              </Campo>
              {arte.template === 'tarjas' && ['titulo', 'texto'].includes(selecionado) && <Campo rotulo="Cor do bloco">
                <Cores valor={selecionado === 'titulo' ? arte.corTarja : est.fundo ?? arte.corDestaque} onChange={cor => {
                  if (selecionado === 'titulo') mudar({ corTarja: cor, semEnfeites: false })
                  else mudarSlide(s => ({ ...s, semEnfeites: false, est: { ...s.est, texto: { ...s.est?.texto, fundo: cor } } }))
                }} />
              </Campo>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Template">{seletorModelo}</Campo>
                <Campo rotulo="Formato (todos os slides)">
                  <select value={formato} onChange={(e) => mudarProjeto({ formato: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    {Object.entries(FORMATOS).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
                  </select>
                </Campo>
              </div>
              {seletorVisual}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={projeto.contador} onChange={(e) => mudarProjeto({ contador: e.target.checked })} />
                Numerar os slides (1/{slides.length}) em manuscrita
              </label>

              <details><summary className="text-xs cursor-pointer">Adicionar texto ou editar campos vazios</summary><div className="space-y-3 mt-3">
              <Campo rotulo="Título (*trecho* ganha a cor de destaque)">
                <textarea rows={2} value={arte.titulo} onChange={(e) => mudar({ titulo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>
              <Campo rotulo={arte.template === 'chat' ? 'Mensagens (uma por linha; ">" no começo = sua)' : arte.template === 'busca' ? 'Busca na 1ª linha, sugestões nas seguintes' : 'Texto'}>
                <textarea rows={3} value={arte.texto} onChange={(e) => mudar({ texto: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>
              <Campo rotulo="Detalhe manuscrito (opcional)">
                <textarea rows={2} value={arte.detalhe} onChange={(e) => mudar({ detalhe: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>

              </div></details>
              <Campo rotulo="Fundo"><Cores valor={arte.fundo} onChange={(fundo) => mudar({ fundo })} /></Campo>
              <Campo rotulo="Cor de destaque"><Cores valor={arte.corDestaque} onChange={(corDestaque) => mudar({ corDestaque })} /></Campo>
              {arte.template === 'tarjas' && <Campo rotulo="Cor da tarja"><Cores valor={arte.corTarja} onChange={(corTarja) => mudar({ corTarja })} /></Campo>}

              {painelEmojis}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
