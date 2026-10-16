import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Download, ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { CORES, EMOJIS, FONTES_TITULO, FORMATOS, emojiUrl, hex, normalizar } from './marca'
import { TEMPLATES, Emojis } from './Templates'
import './marca.css'

const CHAVE = 'studio-arte:rascunho'

const carregar = () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
    if (salvo?.template in TEMPLATES) return normalizar(salvo, { ...TEMPLATES[salvo.template].padrao, template: salvo.template })
  } catch { /* rascunho ilegível: começa do padrão */ }
  return { ...TEMPLATES.tarjas.padrao, template: 'tarjas' }
}

// Bloco fica fora do Canvas para manter a mesma identidade entre renders: recriado a cada
// movimento, ele remontaria e perderia o arrasto no meio.
const ArrastoCtx = createContext(null)

function Bloco({ id, largura, children }) {
  const { pos, alca } = useContext(ArrastoCtx)
  const p = pos[id] ?? { x: 80, y: 200 }
  const a = alca(id, p.x, p.y)
  return <div {...a} style={{ ...a.style, position: 'absolute', left: p.x, top: p.y, width: largura }}>{children}</div>
}

/** A arte em tamanho real; o pai reduz com scale para caber na tela. Blocos e emojis se arrastam. */
function Canvas({ arte, escala, onMover, nodeRef }) {
  const { w, h } = FORMATOS[arte.formato]
  const T = TEMPLATES[arte.template]
  const arrasto = useRef(null)

  const iniciar = (e, chave, x, y) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { chave, x0: e.clientX, y0: e.clientY, x, y }
  }
  const mover = (e) => {
    const d = arrasto.current
    if (!d) return
    onMover(d.chave, Math.round(d.x + (e.clientX - d.x0) / escala), Math.round(d.y + (e.clientY - d.y0) / escala))
  }
  const soltar = () => { arrasto.current = null }
  const alca = (chave, x, y) => ({ onPointerDown: (e) => iniciar(e, chave, x, y), onPointerMove: mover, onPointerUp: soltar, style: { cursor: 'move', touchAction: 'none' } })

  return (
    <div ref={nodeRef} style={{ position: 'relative', width: w, height: h, overflow: 'hidden', background: hex(arte.fundo) }}>
      <ArrastoCtx.Provider value={{ pos: arte.pos, alca }}>
        <T.Corpo a={arte} Bloco={Bloco} />
      </ArrastoCtx.Provider>
      <Emojis a={arte} />
      {arte.emojis.map((e, i) => (
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

export default function ArteStudio() {
  const [arte, setArte] = useState(carregar)
  const [exportando, setExportando] = useState(false)
  const node = useRef(null)
  const { w, h } = FORMATOS[arte.formato]
  const escala = 520 / w

  useEffect(() => {
    try { localStorage.setItem(CHAVE, JSON.stringify(arte)) } catch { /* sem espaço: segue sem salvar o rascunho */ }
  }, [arte])

  const mudar = (campos) => setArte((a) => ({ ...a, ...campos }))
  const trocarTemplate = (id) => setArte((a) => normalizar({ titulo: a.titulo, texto: a.texto, detalhe: a.detalhe, foto: a.foto, formato: a.formato }, { ...TEMPLATES[id].padrao, template: id }))
  const mover = (chave, x, y) =>
    setArte((a) => {
      if (chave.startsWith('emoji:')) {
        const i = Number(chave.slice(6))
        return { ...a, emojis: a.emojis.map((e, j) => (j === i ? { ...e, x, y } : e)) }
      }
      return { ...a, pos: { ...a.pos, [chave]: { x, y } } }
    })

  const escolherFoto = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const leitor = new FileReader()
    leitor.onload = () => mudar({ foto: leitor.result, veu: arte.veu || 0.3 })
    leitor.readAsDataURL(f)
  }

  const exportar = async () => {
    setExportando(true)
    try {
      const url = await toPng(node.current, { width: w, height: h, pixelRatio: 1, cacheBust: true })
      const link = document.createElement('a')
      link.href = url
      link.download = `${(arte.titulo || 'arte').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`
      link.click()
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">Arraste os textos e os emojis direto na arte.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => trocarTemplate(arte.template)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><RotateCcw size={15} />Posições padrão</button>
          <button type="button" onClick={exportar} disabled={exportando} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"><Download size={15} />{exportando ? 'Exportando…' : 'Baixar PNG'}</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="shrink-0 rounded-xl overflow-hidden border border-gray-200" style={{ width: w * escala, height: h * escala }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left' }}>
            <Canvas arte={arte} escala={escala} onMover={mover} nodeRef={node} />
          </div>
        </div>

        <div className="flex-1 w-full max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Template">
              <select value={arte.template} onChange={(e) => trocarTemplate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Formato">
              <select value={arte.formato} onChange={(e) => mudar({ formato: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                {Object.entries(FORMATOS).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
              </select>
            </Campo>
          </div>

          <Campo rotulo="Título (*trecho* ganha a cor de destaque)">
            <textarea rows={3} value={arte.titulo} onChange={(e) => mudar({ titulo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
          </Campo>
          <Campo rotulo={arte.template === 'chat' ? 'Mensagens (uma por linha; ">" no começo = sua)' : arte.template === 'busca' ? 'Busca na 1ª linha, sugestões nas seguintes' : 'Texto'}>
            <textarea rows={4} value={arte.texto} onChange={(e) => mudar({ texto: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
          </Campo>
          <Campo rotulo="Detalhe manuscrito (opcional)">
            <input value={arte.detalhe} onChange={(e) => mudar({ detalhe: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Fonte do título">
              <select value={arte.fonteTitulo} onChange={(e) => mudar({ fonteTitulo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                {Object.entries(FONTES_TITULO).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
              </select>
            </Campo>
            <Campo rotulo={`Tamanho do título: ${arte.tamanhoTitulo}px`}>
              <input type="range" min={48} max={200} value={arte.tamanhoTitulo} onChange={(e) => mudar({ tamanhoTitulo: Number(e.target.value) })} className="w-full" />
            </Campo>
          </div>

          <Campo rotulo="Fundo"><Cores valor={arte.fundo} onChange={(fundo) => mudar({ fundo })} /></Campo>
          <Campo rotulo="Cor do título"><Cores valor={arte.corTitulo} onChange={(corTitulo) => mudar({ corTitulo })} /></Campo>
          <Campo rotulo="Cor do texto"><Cores valor={arte.corTexto} onChange={(corTexto) => mudar({ corTexto })} /></Campo>
          <Campo rotulo="Cor de destaque"><Cores valor={arte.corDestaque} onChange={(corDestaque) => mudar({ corDestaque })} /></Campo>
          {arte.template === 'tarjas' && <Campo rotulo="Cor da tarja"><Cores valor={arte.corTarja} onChange={(corTarja) => mudar({ corTarja })} /></Campo>}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <ImagePlus size={15} />{arte.foto ? 'Trocar foto' : 'Colocar foto'}
                <input type="file" accept="image/*" onChange={escolherFoto} className="hidden" />
              </label>
              {arte.foto && <button type="button" onClick={() => mudar({ foto: '' })} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"><Trash2 size={14} />Tirar</button>}
            </div>
            {arte.foto && (
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Horizontal"><input type="range" min={0} max={100} value={arte.fotoX} onChange={(e) => mudar({ fotoX: Number(e.target.value) })} className="w-full" /></Campo>
                <Campo rotulo="Vertical"><input type="range" min={0} max={100} value={arte.fotoY} onChange={(e) => mudar({ fotoY: Number(e.target.value) })} className="w-full" /></Campo>
                <Campo rotulo="Zoom"><input type="range" min={100} max={250} value={arte.fotoZoom} onChange={(e) => mudar({ fotoZoom: Number(e.target.value) })} className="w-full" /></Campo>
                <Campo rotulo="Véu sobre a foto"><input type="range" min={0} max={60} value={Math.round(arte.veu * 100)} onChange={(e) => mudar({ veu: Number(e.target.value) / 100 })} className="w-full" /></Campo>
              </div>
            )}
          </div>

          <Campo rotulo="Emojis (clique para adicionar; arraste na arte; clique no × para tirar)">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {EMOJIS.map((cod) => (
                <button key={cod} type="button" onClick={() => mudar({ emojis: [...arte.emojis, { cod, x: w / 2 - 50, y: h / 2 - 50, tam: 100 }] })} className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 p-1">
                  <img src={emojiUrl(cod)} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {arte.emojis.map((e, i) => (
                <button key={i} type="button" onClick={() => mudar({ emojis: arte.emojis.filter((_, j) => j !== i) })} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-xs">
                  <img src={emojiUrl(e.cod)} alt="" className="w-4 h-4" />×
                </button>
              ))}
            </div>
          </Campo>
        </div>
      </div>
    </div>
  )
}
