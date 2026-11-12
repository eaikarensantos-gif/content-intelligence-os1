import { Loader2 } from 'lucide-react'

const botao = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-orange-300 text-orange-800 hover:bg-orange-50 disabled:opacity-40'
const MIN_GANHO = 1

const Miniatura = ({ src }) => (
  <div className="w-14 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100" style={{ aspectRatio: '3 / 4' }}>
    {src && <img src={src} alt="" className="h-full w-full object-cover" />}
  </div>
)

/**
 * Resposta do "Sugerir outro" para o post selecionado: outras versões da arte (só post novo) e outros posts
 * que ficariam melhor naquela posição. Cada item mostra a nota que a grade teria.
 */
export default function SugerirOutro({ sugestao, nomes, imagens, nota, bloqueado, onUsarVersao, onTrocar }) {
  const melhores = sugestao.variantes.filter((v) => v.nota - nota >= MIN_GANHO)
  return (
    <section className="rounded-lg border border-orange-200 p-2 space-y-3" aria-label="Sugestões para este post">
      <p className="text-xs text-gray-500">Nota agora: {nota} de 100. Cada sugestão mostra a nota da grade inteira com a mudança.</p>

      {sugestao.novo && (
        <div className="space-y-2" aria-label="Outra versão da arte">
          <h3 className="text-sm font-medium">Outra versão da arte</h3>
          {sugestao.estado === 'carregando' && <p role="status" className="flex items-center gap-2 text-sm text-gray-600"><Loader2 size={15} className="animate-spin" />{sugestao.progresso || 'Procurando versões…'}</p>}
          {sugestao.estado === 'pronto' && !melhores.length && <p className="text-sm text-gray-700">Nenhuma versão de fundo ou layout melhora a nota aqui. Para testar outro lugar, use "Mover para antes" ou "Mover para depois".</p>}
          {melhores.map((v, i) => (
            <div key={i} className="flex items-center gap-3" data-versao={v.rotulo}>
              <Miniatura src={v.thumb} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{v.rotulo}</p>
                <p className="text-xs text-gray-600">Nota {nota} para <strong>{Math.round(v.nota)}</strong></p>
              </div>
              <button type="button" className={botao} disabled={bloqueado} onClick={() => onUsarVersao(v)}>Usar esta versão</button>
            </div>
          ))}
          {sugestao.estado === 'pronto' && melhores.length > 0 && <p className="text-xs text-gray-500">No editor, "Desfazer" volta a versão anterior.</p>}
        </div>
      )}

      <div className="space-y-2" aria-label="Outro post nesta posição">
        <h3 className="text-sm font-medium">Outro post nesta posição</h3>
        {!sugestao.trocas.length && <p className="text-sm text-gray-700">Nenhuma troca com outro post melhora a nota. Este lugar está bom para este post.</p>}
        {sugestao.trocas.map((t) => (
          <div key={t.id} className="flex items-center gap-3" data-troca={t.id}>
            <Miniatura src={imagens[t.id]} />
            <div className="min-w-0 flex-1">
              <p className="text-sm break-words">{nomes[t.id] ?? t.id}</p>
              <p className="text-xs text-gray-600">Hoje na posição {t.indice + 1}. Nota {nota} para <strong>{t.nota}</strong>{t.real ? '' : '. Só simulação, porque o Instagram mostra por data.'}</p>
            </div>
            <button type="button" className={botao} onClick={() => onTrocar(t)}>{t.real ? 'Trocar de lugar' : 'Simular troca'}</button>
          </div>
        ))}
      </div>
    </section>
  )
}
