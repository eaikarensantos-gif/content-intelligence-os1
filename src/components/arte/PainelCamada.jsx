import { ChevronDown, RotateCcw, Scissors, Trash2 } from 'lucide-react'
import { descreverCamada } from './cartoes/render'
import { FONTES } from './marca'
import { Campo, Cores, Faixa } from './controles'

export default function PainelCamada({ arte, def, elCamada, camadaSel, camada, camposSelecionados, idsSelecionados, selecionado, setSelecionado, apagarElemento, mudarCamada, renderCampoTexto }) {
  return (
            <div className="order-first rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3" data-testid="painel-camada">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 truncate">{descreverCamada(elCamada)}</span>
                <button type="button" onClick={() => setSelecionado(null)} className="text-xs text-gray-500 hover:underline shrink-0">Fechar</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => apagarElemento(selecionado)} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} />Apagar da arte</button>
                <span className="text-xs text-gray-500">Ou pressione Delete após selecionar na arte.</span>
              </div>
              {camposSelecionados.length > 0 && <details className="space-y-2" aria-label="Texto selecionado"><summary className="text-xs cursor-pointer py-2.5">Edição alternativa e sobreposição</summary>
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
  )
}
