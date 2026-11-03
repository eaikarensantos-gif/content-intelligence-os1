import { Scissors } from 'lucide-react'
import { TEMPLATES } from './Templates'
import { Faixa } from './controles'

export default function PainelFoto({ arte, w, h, mudar, gerarRecorte, apagarElemento, ocupado }) {
  return (
            <div className="order-first rounded-xl border border-gray-200 p-4 space-y-3" aria-label="Editar foto">
              <h2 className="text-sm font-semibold">Foto · tamanho, posição e corte</h2>
              <Faixa rotulo="Tamanho da foto (%)" valor={arte.fotoZoom} min={10} max={400} onChange={(fotoZoom) => mudar({ fotoZoom })} />
              <div className="grid grid-cols-2 gap-3">
                <Faixa rotulo="Mover para os lados (px)" valor={arte.fotoDX ?? 0} min={-w} max={w} passo={5} onChange={(fotoDX) => mudar({ fotoDX })} />
                <Faixa rotulo="Mover para cima/baixo (px)" valor={arte.fotoDY ?? 0} min={-h} max={h} passo={5} onChange={(fotoDY) => mudar({ fotoDY })} />
              </div>
              <p className="text-xs text-gray-500">Corte as bordas sem perder a foto original.</p>
              <div className="grid grid-cols-2 gap-3">
                {[['topo', 'Cortar em cima (%)'], ['base', 'Cortar embaixo (%)'], ['esquerda', 'Cortar à esquerda (%)'], ['direita', 'Cortar à direita (%)']].map(([lado, nome]) => (
                  <Faixa key={lado} rotulo={nome} valor={arte.fotoCorte?.[lado] ?? 0} min={0} max={49} onChange={(v) => mudar({ fotoCorte: { ...arte.fotoCorte, [lado]: v } })} />
                ))}
              </div>
              <Faixa rotulo="Véu (%)" valor={Math.round(arte.veu * 100)} min={0} max={60} onChange={(v) => mudar({ veu: v / 100 })} />
              {(arte.template === 'caixa' || arte.template === 'cabecaCaixa') && <Faixa rotulo="Onde a foto começa (px)" valor={arte.corte} min={0} max={h - 100} passo={10} onChange={(corte) => mudar({ corte })} />}
              <div className="flex flex-wrap gap-x-3 text-xs">
                <button type="button" onClick={() => mudar({ fotoX: 50, fotoY: 30, fotoZoom: 100, fotoDX: 0, fotoDY: 0, fotoCorte: {} })} className="min-h-11 text-orange-700">Restaurar enquadramento</button>
                {TEMPLATES[arte.template].recorta && <button type="button" onClick={() => gerarRecorte(arte.foto)} disabled={!!ocupado} className="flex items-center gap-1 min-h-11 disabled:opacity-40"><Scissors size={14} />Recortar pessoa (remover fundo)</button>}
                <button type="button" onClick={() => apagarElemento('foto')} className="min-h-11 text-red-600">Apagar foto</button>
              </div>
            </div>
  )
}
