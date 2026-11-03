import { createContext, useContext, useRef } from 'react'
import { FONTE_DETALHE, hex } from './marca'
import { TEMPLATES, Emojis } from './Templates'
import { CartaoCorpo } from './cartoes/Cartao'
import { ehCartao } from './cartoes/render'
import { tamanho } from './conteudoSlide'

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
export function Canvas({ arte, formato, contador, escala = 1, onMover, onMoverCamada, onSelecionar, selecionado, nodeRef, interativo = true, grao = true }) {
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
