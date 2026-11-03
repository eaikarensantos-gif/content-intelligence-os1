import { Trash2 } from 'lucide-react'
import { emojiUrl } from './marca'
import { NOMES_BLOCO } from './conteudoSlide'

export default function ElementosDaArte({ arte, selecionado, setSelecionado, mudar, mudarEst, apagarElemento }) {
  return (
<details className="rounded-xl border border-gray-200 p-3 space-y-2" aria-label="Elementos da arte">
            <summary className="text-sm font-semibold cursor-pointer py-2.5">Elementos da arte · adicionar ou restaurar texto</summary>
            {Object.entries(NOMES_BLOCO).map(([id, nome]) => (
              <div key={id} className="flex items-center gap-2">
                <button type="button" onClick={() => setSelecionado(id)} className={`flex-1 text-left text-sm rounded px-2 py-1 min-h-11 ${selecionado === id ? 'bg-orange-100 text-orange-800' : 'hover:bg-gray-50'}`}>{nome}{arte.est?.[id]?.oculto ? ' (apagado)' : !arte[id] ? ' (vazio)' : ''}</button>
                {arte.est?.[id]?.oculto ? <button type="button" onClick={() => { mudarEst(id, { oculto: false }); setSelecionado(id) }} className="min-h-11 px-1 text-xs text-orange-700">Restaurar {nome.toLowerCase()}</button> : <button type="button" aria-label={`Apagar ${nome.toLowerCase()}`} onClick={() => apagarElemento(id)} className="flex items-center justify-center min-h-11 min-w-11 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            {['tarjas', 'caixa', 'selecao'].includes(arte.template) && <div className="flex items-center justify-between text-sm px-2 py-1"><span>Enfeites do modelo</span><button type="button" onClick={() => mudar({ semEnfeites: !arte.semEnfeites })} className="min-h-11 px-1 text-xs text-orange-700">{arte.semEnfeites ? 'Restaurar enfeites' : 'Apagar enfeites'}</button></div>}
            {arte.foto && <button type="button" onClick={() => setSelecionado('foto')} className={`block w-full text-left text-sm rounded px-2 py-1 min-h-11 ${selecionado === 'foto' ? 'bg-orange-100 text-orange-800' : 'hover:bg-gray-50'}`}>Foto · tamanho e corte</button>}
            {arte.emojis.map((e, i) => <div key={i} className="flex items-center gap-2"><button type="button" onClick={() => setSelecionado(`emoji:${i}`)} className="flex flex-1 items-center gap-2 min-h-11 text-sm px-2 py-1"><img src={emojiUrl(e.cod)} alt="" className="w-5 h-5" />Emoji {i + 1}</button><button type="button" aria-label={`Apagar emoji ${i + 1}`} onClick={() => apagarElemento(`emoji:${i}`)} className="flex items-center justify-center min-h-11 min-w-11 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button></div>)}
          </details>
  )
}
