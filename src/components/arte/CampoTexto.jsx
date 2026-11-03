import { textosDe } from './cartoes/render'
import { Campo } from './controles'

/** Campo de texto de um card da coleção, com a escolha de camada (atrás ou na frente da pessoa recortada). */
export default function CampoTexto({ c, compacto = false, def, arte, mudarTexto, mudarCamada, setSelecionado }) {
  const valor = textosDe(def, arte)[c.id] ?? ''
  return (
      <Campo rotulo={c.rotulo}>
        <textarea rows={Math.min(4, Math.max(1, valor.split('\n').length + (valor.length > 60 ? 1 : 0)))} value={valor} onChange={(e) => mudarTexto(c.id, e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" data-campo={c.id} />
        {c.ajuda && <span className="block text-xs text-gray-400 mt-0.5">{c.ajuda}</span>}
        {def.camadasTexto?.[c.id] != null && (
          <span className="block mt-2 space-y-1">
            <span className="block text-xs text-gray-600">Sobreposição com a pessoa recortada</span>
            <select aria-label={`${c.rotulo}: sobreposição`} value={arte.camadas?.[def.camadasTexto[c.id]]?.plano ?? ''} onChange={(e) => mudarCamada(def.camadasTexto[c.id], { plano: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm">
              <option value="">Ordem do modelo</option>
              <option value="atras">Atrás da pessoa</option>
              <option value="frente">Na frente da pessoa</option>
            </select>
            {!compacto && <button type="button" onClick={() => setSelecionado(`camada:${def.camadasTexto[c.id]}`)} className="min-h-11 text-xs text-orange-700 underline">Selecionar este texto na arte</button>}
          </span>
        )}
      </Campo>
  )
}
