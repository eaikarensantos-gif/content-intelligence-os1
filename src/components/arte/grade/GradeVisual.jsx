import { Pin } from 'lucide-react'
import { JANELA } from './harmonia'

const PROPORCOES = { '3/4': '3 / 4', '4/5': '4 / 5' }

/**
 * A grade do perfil: 3 colunas, do post mais recente para o mais antigo.
 * Cada tile é { id, origem: 'novo' | 'publicado', nome, img, fixado }.
 */
export default function GradeVisual({ tiles, proporcao, selecionado, destacados = [], onSelecionar }) {
  return (
    <ol className="grid grid-cols-3 gap-0.5 bg-white" aria-label="Grade do perfil no Instagram">
      {tiles.map((t, i) => {
        const novo = t.origem === 'novo'
        const marcado = destacados.includes(i)
        return (
          <li key={t.id} className={i >= JANELA ? 'opacity-60' : ''}>
            <button
              type="button"
              data-tile={t.id}
              data-origem={t.origem}
              aria-pressed={selecionado === t.id}
              aria-label={`Posição ${i + 1}: ${t.nome}${novo ? ', post novo' : ''}${t.fixado ? ', fixado' : ''}`}
              onClick={() => onSelecionar(selecionado === t.id ? null : t.id)}
              className={`relative block w-full overflow-hidden bg-gray-100 ${selecionado === t.id ? 'ring-2 ring-orange-600 ring-inset' : ''} ${marcado ? 'outline outline-2 outline-red-600 -outline-offset-2' : ''}`}
              style={{ aspectRatio: PROPORCOES[proporcao] }}
            >
              {t.img
                ? <img src={t.img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                : <span className="absolute inset-0 flex items-center justify-center p-1 text-[11px] text-gray-500">{novo ? 'Gerando a prévia…' : 'Sem imagem'}</span>}
              {novo && <span className="absolute left-1 top-1 rounded bg-orange-700 px-1.5 py-0.5 text-[10px] font-medium text-white">Novo</span>}
              {t.fixado && <span className="absolute right-1 top-1 rounded bg-white/90 p-1 text-gray-800"><Pin size={12} aria-hidden="true" /></span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
