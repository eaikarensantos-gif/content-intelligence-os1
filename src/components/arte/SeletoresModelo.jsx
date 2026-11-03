import { CARTOES, CATEGORIAS } from './cartoes/colecao'
import { TEMPLATES } from './Templates'
import { Canvas } from './CanvasArte'
import { tamanho } from './conteudoSlide'

/** Lista com todos os modelos pelo nome: trocar aqui leva título, texto e foto do card para o modelo escolhido. */
export function SeletorModelo({ arte, cartao, trocarPelaLista }) {
  return (
    <select value={cartao ? `cartao:${arte.cartao}` : arte.template} onChange={(e) => trocarPelaLista(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" aria-label="Modelo">
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
}

/** Miniaturas de todos os modelos já com o título, o texto e a foto deste card. */
export function SeletorVisual({ previas, categoriaAtual, setCatVisual, modeloAtual, trocarPelaLista }) {
const chipVisual = (ativo) => `shrink-0 px-2.5 py-1.5 rounded-full text-xs border ${ativo ? 'bg-orange-700 border-orange-700 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`
  return (
    <div className="rounded-xl border border-gray-200 p-3 space-y-2" aria-label="Modelos com o seu texto">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900">Modelos com o seu texto</span>
        <span className="text-xs text-gray-500">{previas.length} {previas.length === 1 ? 'modelo' : 'modelos'}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button type="button" className={chipVisual(categoriaAtual === 'todas')} onClick={() => setCatVisual('todas')}>Todas</button>
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
}
