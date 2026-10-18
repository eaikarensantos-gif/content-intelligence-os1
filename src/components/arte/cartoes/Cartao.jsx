import { useLayoutEffect, useMemo, useRef } from 'react'
import { CARTAO } from './colecao'
import { aplicarCamadas, camadaDe, htmlCartao } from './render'

/**
 * Desenha um card da coleção em tamanho real. Cada filho direto é uma camada: clicar seleciona,
 * arrastar move. Os ajustes (posição, tamanho, cor, fonte, corte, apagar) vêm de arte.camadas.
 */
export function CartaoCorpo({ arte, interativo = false, selecionado = null, onSelecionar, onMoverCamada, escala = 1, grao = true }) {
  const def = CARTAO[arte.cartao]
  const html = useMemo(() => htmlCartao(def, arte, { grao }), [def, arte.textos, arte.fotos, grao]) // eslint-disable-line react-hooks/exhaustive-deps
  const raiz = useRef(null)
  const arrasto = useRef(null)

  useLayoutEffect(() => { aplicarCamadas(raiz.current, arte.camadas, interativo ? selecionado : null, arte.estiloLote) })

  const iniciar = (e) => {
    if (!interativo) return
    const i = camadaDe(raiz.current, e.target)
    if (i < 0) return
    e.preventDefault()
    e.stopPropagation()
    const c = arte.camadas?.[i] ?? {}
    arrasto.current = { i, x0: e.clientX, y0: e.clientY, dx: c.dx ?? 0, dy: c.dy ?? 0 }
    onSelecionar?.(`camada:${i}`)
  }
  const mover = (e) => {
    const d = arrasto.current
    if (!d) return
    if (!d.movendo && Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 3) return
    d.movendo = true
    e.currentTarget.setPointerCapture(e.pointerId)
    onMoverCamada?.(d.i, Math.round(d.dx + (e.clientX - d.x0) / escala), Math.round(d.dy + (e.clientY - d.y0) / escala))
  }
  const soltar = () => { arrasto.current = null }

  return (
    <div
      ref={raiz}
      className="kc"
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
      style={{ position: 'absolute', left: 0, top: 0, width: def.w, height: def.h, isolation: 'isolate', cursor: interativo ? 'move' : undefined, touchAction: interativo ? 'none' : undefined }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
