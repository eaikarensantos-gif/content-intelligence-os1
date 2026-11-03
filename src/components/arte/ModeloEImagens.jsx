import { ImagePlus, Images, LayoutGrid, Trash2 } from 'lucide-react'
import { urlFoto } from './cartoes/render'
import { Campo } from './controles'

export default function ModeloEImagens({ arte, def, cartao, fotosCartao, itensGaleria, setGaleria, escolherFoto, abrirBanco, mudar, fotoOriginal }) {
  return (
          <details className="rounded-xl border border-gray-200 p-3" open>
            <summary className="text-sm font-semibold cursor-pointer py-2.5">Modelo e imagens</summary>
        {/* Todas as fontes de imagem ficam junto ao modelo. */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setGaleria(true)} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800"><LayoutGrid size={15} />Modelos de arte ({itensGaleria.length})</button>
          {!cartao && <label className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <ImagePlus size={15} />{arte.foto ? 'Trocar foto' : 'Colocar foto'}
            <input type="file" accept="image/*" onChange={escolherFoto(null)} className="hidden" />
          </label>}
          {!cartao && <button type="button" onClick={() => abrirBanco(null)} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><Images size={15} />Do meu banco</button>}
          {!cartao && arte.foto && <button type="button" onClick={() => mudar({ foto: '', recorte: '' })} className="flex items-center gap-1 min-h-11 px-2 text-sm text-gray-500 hover:text-red-600"><Trash2 size={14} />Apagar foto</button>}
        </div>
              {fotosCartao.length > 0 && (
                <Campo rotulo={fotosCartao.length > 1 ? `Fotos (${fotosCartao.length})` : 'Foto'}>
                  <div className="space-y-2">
                    {fotosCartao.map((slot, i) => (
                      <div key={slot} className="flex items-center gap-2">
                        <span className="w-10 h-12 rounded-md bg-cover bg-center border border-gray-200 shrink-0" style={{ backgroundImage: `url('${urlFoto(def, arte, slot)}')` }} />
                        <span className="text-xs text-gray-500 w-12 shrink-0">Foto {i + 1}</span>
                        <label className="flex items-center min-h-11 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">Trocar<input type="file" accept="image/*" onChange={escolherFoto(slot)} className="hidden" /></label>
                        <button type="button" onClick={() => abrirBanco(slot)} className="min-h-11 px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50">Do banco</button>
                        {arte.fotos?.[slot] && <button type="button" onClick={() => fotoOriginal(slot)} className="min-h-11 px-1 text-xs text-gray-500 hover:underline">Foto original</button>}
                      </div>
                    ))}
                  </div>
                  {def.cabeca && <span className="block text-xs text-gray-400 mt-1">Ao trocar a foto, o Studio recorta a pessoa de novo para a palavra ficar atrás da cabeça.</span>}
                </Campo>
              )}
          </details>
  )
}
