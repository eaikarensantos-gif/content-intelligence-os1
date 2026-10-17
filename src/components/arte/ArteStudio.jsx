import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { AlignCenter, AlignLeft, AlignRight, Copy, Download, ImagePlus, Images, Loader2, Plus, RotateCcw, Scissors, Trash2 } from 'lucide-react'
import { CORES, EMOJIS, FONTES_TITULO, FONTE_DETALHE, FORMATOS, emojiUrl, hex, normalizar } from './marca'
import { TEMPLATES, Emojis } from './Templates'
import { lerRascunho, salvarRascunho } from './armazem'
import { prepararFoto, recortarPessoa } from './recorte'
import { fixarTextos, montarProjeto, pedidoDeSlides, pedirArte, pegarEntrada } from './pedido'
import Pedido from './Pedido'
import Banco from './Banco'
import './marca.css'

const novoSlide = (template = 'tarjas', herdado = {}) => normalizar(herdado, { ...TEMPLATES[template].padrao, template })
const PROJETO_INICIAL = { formato: 'feed', contador: false, atual: 0, slides: [novoSlide()] }

const NOMES_BLOCO = { titulo: 'Título', texto: 'Texto', detalhe: 'Detalhe manuscrito' }
const LARGURA_PADRAO = { titulo: 920, texto: 880, detalhe: 460 }

// Bloco fica fora do Canvas para manter a mesma identidade entre renders: recriado a cada
// movimento, ele remontaria e perderia o arrasto no meio.
const ArrastoCtx = createContext(null)

function Bloco({ id, largura, children }) {
  const { arte, alca, selecionado, interativo } = useContext(ArrastoCtx)
  const p = arte.pos[id] ?? { x: 80, y: 200 }
  const a = alca(id, p.x, p.y)
  const w = arte.est?.[id]?.largura ?? largura
  return (
    <div {...(interativo ? a : {})} style={{ ...(interativo ? a.style : {}), position: 'absolute', left: p.x, top: p.y, width: w, outline: interativo && selecionado === id ? '4px dashed #F97316' : 'none', outlineOffset: 12 }}>
      {children}
    </div>
  )
}

/** A arte em tamanho real; o pai reduz com scale para caber na tela. */
function Canvas({ arte, formato, contador, escala = 1, onMover, onSelecionar, selecionado, nodeRef, interativo = true }) {
  const { w, h } = FORMATOS[formato]
  const T = TEMPLATES[arte.template]
  const arrasto = useRef(null)

  const iniciar = (e, chave, x, y) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { chave, x0: e.clientX, y0: e.clientY, x, y }
    if (!chave.startsWith('emoji:')) onSelecionar?.(chave)
  }
  const mover = (e) => {
    const d = arrasto.current
    if (!d) return
    onMover(d.chave, Math.round(d.x + (e.clientX - d.x0) / escala), Math.round(d.y + (e.clientY - d.y0) / escala))
  }
  const soltar = () => { arrasto.current = null }
  const alca = (chave, x, y) => ({ onPointerDown: (e) => iniciar(e, chave, x, y), onPointerMove: mover, onPointerUp: soltar, style: { cursor: 'move', touchAction: 'none' } })

  return (
    <div ref={nodeRef} onPointerDown={() => interativo && onSelecionar?.(null)} style={{ position: 'relative', width: w, height: h, overflow: 'hidden', background: hex(arte.fundo) }}>
      <ArrastoCtx.Provider value={{ arte, alca, selecionado, interativo }}>
        <T.Corpo a={arte} Bloco={Bloco} />
      </ArrastoCtx.Provider>
      <Emojis a={arte} />
      {contador && (
        <div style={{ position: 'absolute', right: 70, top: 56, fontFamily: FONTE_DETALHE, fontSize: 40, color: hex(['cafe', 'tinta', 'terracota'].includes(arte.fundo) ? 'creme' : 'cafe') }}>{contador}</div>
      )}
      {interativo && arte.emojis.map((e, i) => (
        <div key={i} {...alca(`emoji:${i}`, e.x, e.y)} style={{ position: 'absolute', left: e.x, top: e.y, width: e.tam, height: e.tam, cursor: 'move', touchAction: 'none' }} />
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

const nomeArquivo = (s, n) => `${String(n).padStart(2, '0')}-${(s || 'arte').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}.png`

export default function ArteStudio() {
  const [projeto, setProjeto] = useState(PROJETO_INICIAL)
  const [carregado, setCarregado] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [ocupado, setOcupado] = useState('')
  const [aviso, setAviso] = useState('')
  const [anterior, setAnterior] = useState(null)
  const [bancoAberto, setBancoAberto] = useState(false)
  const node = useRef(null)

  const { formato, slides, atual } = projeto
  const arte = slides[atual]
  const { w, h } = FORMATOS[formato]
  // No celular a arte encolhe para caber na tela, com o painel logo abaixo.
  const escala = Math.min(520, typeof window !== 'undefined' ? window.innerWidth - 48 : 520) / w
  const contadorDe = (i) => (projeto.contador && slides.length > 1 ? `${i + 1}/${slides.length}` : '')

  useEffect(() => {
    lerRascunho().then((salvo) => {
      if (salvo?.slides?.length) {
        const slides = salvo.slides.filter((s) => s.template in TEMPLATES).map((s) => normalizar(s, { ...TEMPLATES[s.template].padrao, template: s.template }))
        if (slides.length) setProjeto({ ...PROJETO_INICIAL, ...salvo, slides, atual: Math.min(salvo.atual ?? 0, slides.length - 1) })
      }
      setCarregado(true)
    })
  }, [])
  useEffect(() => { if (carregado) salvarRascunho(projeto) }, [projeto, carregado])

  const mudarProjeto = (campos) => setProjeto((p) => ({ ...p, ...campos }))
  const mudarSlide = (fn) => setProjeto((p) => ({ ...p, slides: p.slides.map((s, i) => (i === p.atual ? fn(s) : s)) }))
  const mudar = (campos) => mudarSlide((s) => ({ ...s, ...campos }))
  const mudarEst = (id, campos) => mudarSlide((s) => ({ ...s, est: { ...s.est, [id]: { ...(s.est?.[id] ?? {}), ...campos } } }))

  const trocarTemplate = (id) => {
    // Texto que ainda é o exemplo do template antigo dá lugar ao exemplo do novo; texto escrito por ela fica.
    const proprio = (s, k) => (s[k] !== TEMPLATES[s.template].padrao[k] ? { [k]: s[k] } : {})
    mudarSlide((s) => novoSlide(id, { ...proprio(s, 'titulo'), ...proprio(s, 'texto'), ...proprio(s, 'detalhe'), foto: s.foto, recorte: s.recorte, fotoX: s.fotoX, fotoY: s.fotoY, fotoZoom: s.fotoZoom }))
    setSelecionado(null)
    if (TEMPLATES[id].recorta && arte.foto && !arte.recorte) gerarRecorte(arte.foto)
  }
  const mover = (chave, x, y) =>
    mudarSlide((s) => {
      if (chave.startsWith('emoji:')) {
        const i = Number(chave.slice(6))
        return { ...s, emojis: s.emojis.map((e, j) => (j === i ? { ...e, x, y } : e)) }
      }
      return { ...s, pos: { ...s.pos, [chave]: { x, y } } }
    })

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

  // Recebe um arquivo/Blob (upload ou banco) ou um data URL (quadro de vídeo, já reduzido).
  const usarFoto = async (origem) => {
    const foto = typeof origem === 'string' ? origem : await prepararFoto(origem)
    mudar({ foto, recorte: '', veu: arte.veu || 0.3 })
    if (TEMPLATES[arte.template].recorta) gerarRecorte(foto)
  }
  const escolherFoto = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) usarFoto(f)
  }

  const aplicarPedido = (resposta) => {
    const novo = montarProjeto(resposta, arte.foto)
    setAnterior(projeto)
    setProjeto(novo)
    setSelecionado(null)
    const precisa = novo.slides.find((s) => s.foto && TEMPLATES[s.template].recorta)
    if (precisa) gerarRecorte(precisa.foto)
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
      .then((resposta) => aplicarPedido(fixarTextos(resposta, entrada.slides)))
      .catch(() => {
        aplicarPedido({ slides: entrada.slides.map((s) => ({ template: 'corCheia', titulo: s.titulo, texto: s.texto })) })
        setAviso('A IA não respondeu agora. Montei os slides em cor cheia, com o texto do gerador, para você ajustar.')
      })
      .finally(() => setOcupado(''))
  }, [carregado]) // eslint-disable-line react-hooks/exhaustive-deps

  // Slides
  const irPara = (i) => { mudarProjeto({ atual: i }); setSelecionado(null) }
  const adicionar = () => setProjeto((p) => ({ ...p, slides: [...p.slides, novoSlide(p.slides[p.atual].template)], atual: p.slides.length }))
  const duplicar = () => setProjeto((p) => ({ ...p, slides: [...p.slides.slice(0, p.atual + 1), structuredClone(p.slides[p.atual]), ...p.slides.slice(p.atual + 1)], atual: p.atual + 1 }))
  const apagar = () => setProjeto((p) => (p.slides.length < 2 ? p : { ...p, slides: p.slides.filter((_, i) => i !== p.atual), atual: Math.max(0, p.atual - 1) }))
  const mudarOrdem = (d) => setProjeto((p) => {
    const j = p.atual + d
    if (j < 0 || j >= p.slides.length) return p
    const s = [...p.slides];
    [s[p.atual], s[j]] = [s[j], s[p.atual]]
    return { ...p, slides: s, atual: j }
  })

  const baixar = (url, nome) => {
    const link = document.createElement('a')
    link.href = url
    link.download = nome
    link.click()
  }
  const png = () => toPng(node.current, { width: w, height: h, pixelRatio: 1, cacheBust: true })

  const exportarAtual = async () => {
    setSelecionado(null)
    setOcupado('Exportando…')
    try {
      await new Promise((r) => requestAnimationFrame(r))
      baixar(await png(), nomeArquivo(arte.titulo, atual + 1))
    } finally {
      setOcupado('')
    }
  }
  const exportarTodos = async () => {
    setSelecionado(null)
    const volta = atual
    try {
      for (let i = 0; i < slides.length; i++) {
        setOcupado(`Exportando ${i + 1} de ${slides.length}…`)
        mudarProjeto({ atual: i })
        await new Promise((r) => setTimeout(r, 350))
        baixar(await png(), nomeArquivo(slides[i].titulo, i + 1))
      }
    } finally {
      mudarProjeto({ atual: volta })
      setOcupado('')
    }
  }

  const est = selecionado ? arte.est?.[selecionado] ?? {} : {}
  const tamanhoPadrao = { titulo: 100, texto: 40, detalhe: 46 }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        {/* Foto fica aqui em cima para não sumir quando um texto está selecionado nem no celular. */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <ImagePlus size={15} />{arte.foto ? 'Trocar foto' : 'Colocar foto'}
            <input type="file" accept="image/*" onChange={escolherFoto} className="hidden" />
          </label>
          <button type="button" onClick={() => setBancoAberto(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><Images size={15} />Do meu banco</button>
          {arte.foto && <button type="button" onClick={() => mudar({ foto: '', recorte: '' })} className="flex items-center gap-1 px-2 text-sm text-gray-500 hover:text-red-600"><Trash2 size={14} />Tirar foto</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { mudarSlide((s) => ({ ...s, pos: TEMPLATES[s.template].padrao.pos, est: {} })); setSelecionado(null) }} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><RotateCcw size={15} />Posições padrão</button>
          <button type="button" onClick={exportarAtual} disabled={!!ocupado} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-60"><Download size={15} />Baixar este</button>
          <button type="button" onClick={exportarTodos} disabled={!!ocupado} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"><Download size={15} />Baixar todos ({slides.length})</button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-5">Clique num texto para editar só ele. Arraste textos e emojis direto na arte.</p>

      <Pedido onResposta={aplicarPedido} desfazer={anterior ? desfazerPedido : null} />
      {bancoAberto && <Banco onFechar={() => setBancoAberto(false)} onEscolher={(origem) => { setBancoAberto(false); usarFoto(origem) }} />}

      {(ocupado || aviso) && (
        <div className={`mb-4 flex items-center gap-2 text-sm ${aviso ? 'text-red-600' : 'text-gray-600'}`}>
          {ocupado && <Loader2 size={15} className="animate-spin" />}{ocupado || aviso}
        </div>
      )}

      {/* Slides do carrossel */}
      <div className="flex items-end gap-3 mb-5 overflow-x-auto pb-2">
        {slides.map((s, i) => (
          <button key={i} type="button" onClick={() => irPara(i)} className={`shrink-0 rounded-lg overflow-hidden border-2 ${i === atual ? 'border-orange-500' : 'border-transparent hover:border-gray-300'}`} style={{ width: w * 0.08, height: h * 0.08 }}>
            <div style={{ transform: 'scale(0.08)', transformOrigin: 'top left', pointerEvents: 'none' }}>
              <Canvas arte={s} formato={formato} contador={contadorDe(i)} interativo={false} />
            </div>
          </button>
        ))}
        <div className="flex flex-col gap-1">
          <button type="button" onClick={adicionar} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"><Plus size={13} />Novo slide</button>
          <button type="button" onClick={duplicar} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"><Copy size={13} />Duplicar</button>
          <div className="flex gap-1">
            <button type="button" onClick={() => mudarOrdem(-1)} className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">←</button>
            <button type="button" onClick={() => mudarOrdem(1)} className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">→</button>
            <button type="button" onClick={apagar} disabled={slides.length < 2} className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-red-50 disabled:opacity-40"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="shrink-0 rounded-xl overflow-hidden border border-gray-200" style={{ width: w * escala, height: h * escala }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left' }}>
            <Canvas arte={arte} formato={formato} contador={contadorDe(atual)} escala={escala} onMover={mover} onSelecionar={setSelecionado} selecionado={selecionado} nodeRef={node} />
          </div>
        </div>

        <div className="flex-1 w-full max-w-md space-y-4">
          {selecionado ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{NOMES_BLOCO[selecionado]}</span>
                <button type="button" onClick={() => setSelecionado(null)} className="text-xs text-gray-500 hover:underline">Fechar</button>
              </div>
              <textarea rows={3} value={arte[selecionado]} onChange={(e) => mudar({ [selecionado]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              {selecionado === 'titulo' && (
                <Campo rotulo="Fonte">
                  <select value={arte.fonteTitulo} onChange={(e) => mudar({ fonteTitulo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    {Object.entries(FONTES_TITULO).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
                  </select>
                </Campo>
              )}
              <Faixa rotulo="Tamanho" valor={est.tamanho ?? tamanhoPadrao[selecionado]} min={20} max={360} onChange={(tamanho) => mudarEst(selecionado, { tamanho })} />
              <Faixa rotulo="Largura do bloco" valor={est.largura ?? LARGURA_PADRAO[selecionado]} min={200} max={1040} passo={10} onChange={(largura) => mudarEst(selecionado, { largura })} />
              <div className="flex gap-1">
                {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([v, Icone]) => (
                  <button key={v} type="button" onClick={() => mudarEst(selecionado, { alinhar: v })} className={`p-2 rounded-lg border ${est.alinhar === v ? 'border-orange-500 bg-white' : 'border-gray-200'}`}><Icone size={15} /></button>
                ))}
              </div>
              <Campo rotulo={selecionado === 'titulo' ? 'Cor' : selecionado === 'texto' ? 'Cor' : 'Cor (destaque)'}>
                <Cores valor={selecionado === 'titulo' ? arte.corTitulo : selecionado === 'texto' ? arte.corTexto : arte.corDestaque} onChange={(c) => mudar(selecionado === 'titulo' ? { corTitulo: c } : selecionado === 'texto' ? { corTexto: c } : { corDestaque: c })} />
              </Campo>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Template">
                  <select value={arte.template} onChange={(e) => trocarTemplate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Formato (todos os slides)">
                  <select value={formato} onChange={(e) => mudarProjeto({ formato: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    {Object.entries(FORMATOS).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
                  </select>
                </Campo>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={projeto.contador} onChange={(e) => mudarProjeto({ contador: e.target.checked })} />
                Numerar os slides (1/{slides.length}) em manuscrita
              </label>

              <Campo rotulo="Título (*trecho* ganha a cor de destaque)">
                <textarea rows={2} value={arte.titulo} onChange={(e) => mudar({ titulo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>
              <Campo rotulo={arte.template === 'chat' ? 'Mensagens (uma por linha; ">" no começo = sua)' : arte.template === 'busca' ? 'Busca na 1ª linha, sugestões nas seguintes' : 'Texto'}>
                <textarea rows={3} value={arte.texto} onChange={(e) => mudar({ texto: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>
              <Campo rotulo="Detalhe manuscrito (opcional)">
                <input value={arte.detalhe} onChange={(e) => mudar({ detalhe: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>

              <Campo rotulo="Fundo"><Cores valor={arte.fundo} onChange={(fundo) => mudar({ fundo })} /></Campo>
              <Campo rotulo="Cor de destaque"><Cores valor={arte.corDestaque} onChange={(corDestaque) => mudar({ corDestaque })} /></Campo>
              {arte.template === 'tarjas' && <Campo rotulo="Cor da tarja"><Cores valor={arte.corTarja} onChange={(corTarja) => mudar({ corTarja })} /></Campo>}

              <div className="space-y-2">
                {arte.foto && TEMPLATES[arte.template].recorta && (
                  <button type="button" onClick={() => gerarRecorte(arte.foto)} disabled={!!ocupado} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><Scissors size={14} />Refazer recorte</button>
                )}
                {arte.foto && (
                  <div className="grid grid-cols-2 gap-3">
                    <Faixa rotulo="Horizontal" valor={arte.fotoX} min={0} max={100} onChange={(fotoX) => mudar({ fotoX })} />
                    <Faixa rotulo="Vertical" valor={arte.fotoY} min={0} max={100} onChange={(fotoY) => mudar({ fotoY })} />
                    <Faixa rotulo="Zoom" valor={arte.fotoZoom} min={100} max={300} onChange={(fotoZoom) => mudar({ fotoZoom })} />
                    <Faixa rotulo="Véu" valor={Math.round(arte.veu * 100)} min={0} max={60} onChange={(v) => mudar({ veu: v / 100 })} />
                  </div>
                )}
                {(arte.template === 'caixa' || arte.template === 'cabecaCaixa') && (
                  <Faixa rotulo="Onde a foto começa" valor={arte.corte} min={200} max={h - 200} passo={10} onChange={(corte) => mudar({ corte })} />
                )}
              </div>

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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
