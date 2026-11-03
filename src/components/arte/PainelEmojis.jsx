import { Trash2 } from 'lucide-react'
import { EMOJIS, EMOJI_NOMES, emojiUrl } from './marca'
import { Campo } from './controles'

export default function PainelEmojis({ arte, w, h, mudar }) {
  return (
    <Campo rotulo="Emojis (clique para adicionar e arraste na arte)">
      <div className="flex flex-wrap gap-1 mb-2 max-h-28 overflow-y-auto">
        {EMOJIS.map((cod) => (
          <button key={cod} type="button" aria-label={`Adicionar emoji: ${EMOJI_NOMES[cod]}`} title={EMOJI_NOMES[cod]} onClick={() => mudar({ emojis: [...arte.emojis, { cod, x: w / 2 - 50, y: h / 2 - 50, tam: 100 }] })} className="w-11 h-11 rounded-md border border-gray-200 hover:bg-gray-50 p-1.5">
            <img src={emojiUrl(cod)} alt="" className="w-full h-full" />
          </button>
        ))}
      </div>
      {arte.emojis.map((e, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <img src={emojiUrl(e.cod)} alt="" className="w-5 h-5" />
          <input type="range" aria-label={`Tamanho do emoji ${i + 1}`} min={40} max={260} value={e.tam} onChange={(ev) => mudar({ emojis: arte.emojis.map((x, j) => (j === i ? { ...x, tam: Number(ev.target.value) } : x)) })} className="flex-1" />
          <input type="range" min={-30} max={30} value={e.giro ?? 0} onChange={(ev) => mudar({ emojis: arte.emojis.map((x, j) => (j === i ? { ...x, giro: Number(ev.target.value) } : x)) })} className="w-20" title="Girar" aria-label={`Girar emoji ${i + 1}`} />
          <button type="button" aria-label={`Apagar emoji ${i + 1}`} onClick={() => mudar({ emojis: arte.emojis.filter((_, j) => j !== i) })} className="flex items-center justify-center min-h-11 min-w-11 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      ))}
    </Campo>
  )
}
