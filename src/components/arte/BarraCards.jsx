import { Copy, Plus, Trash2 } from 'lucide-react'
import { Canvas } from './CanvasArte'
import { tamanho } from './conteudoSlide'

export default function BarraCards({ slides, formato, atual, irPara, contadorDe, adicionar, duplicar, mudarOrdem, apagar }) {
  return (
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
        <div className="flex flex-col gap-1 min-w-[144px]">
          <button type="button" onClick={adicionar} className="flex items-center gap-1 min-h-11 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"><Plus size={13} />Novo card</button>
          <button type="button" onClick={duplicar} className="flex items-center gap-1 min-h-11 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"><Copy size={13} />Duplicar</button>
          <div className="flex gap-1">
            <button type="button" aria-label="Mover card para antes" onClick={() => mudarOrdem(-1)} className="flex-1 min-h-11 min-w-11 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">←</button>
            <button type="button" aria-label="Mover card para depois" onClick={() => mudarOrdem(1)} className="flex-1 min-h-11 min-w-11 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">→</button>
            <button type="button" aria-label="Apagar card atual" onClick={apagar} disabled={slides.length < 2} className="flex items-center justify-center min-h-11 min-w-11 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-red-50 disabled:opacity-40"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
  )
}
