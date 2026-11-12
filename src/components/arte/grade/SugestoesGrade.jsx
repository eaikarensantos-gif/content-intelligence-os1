import { CORES } from '../marca'

const botao = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-orange-300 text-orange-800 hover:bg-orange-50 disabled:opacity-40'
const MOSTRAR = 6 // pontos de maior peso à vista; o resto fica recolhido
const nomeDaCor = (id) => CORES[id]?.nome ?? id

/** O que o Content sugere para a grade. Cada bloco vale sozinho: a análise é refeita sobre a grade a cada mudança. */
export default function SugestoesGrade({ analise, pendentes, nomes, idealAtivo, bloqueado, onDestacar, onOrdem, onFixar, onFundo, onIdeal }) {
  if (pendentes > 0) return <p role="status" className="text-sm text-gray-600">Lendo a cor das imagens ({pendentes} faltando). A análise sai quando terminar.</p>
  if (!analise) return null
  if (analise.semDados) return <p role="status" className="text-sm text-gray-600">Não consegui ler a cor de imagens suficientes para avaliar. Carregue o feed atual ou adicione posts novos.</p>

  const { atual, ordem, fixar, fundos, ideal } = analise
  const ordenados = [...atual.problemas].sort((a, b) => b.pontos - a.pontos)
  const item = (p, i) => (
    <li key={i}>
      <button type="button" className="min-h-11 text-left text-sm text-gray-800 underline decoration-dotted" onMouseEnter={() => onDestacar(p.indices)} onMouseLeave={() => onDestacar([])} onFocus={() => onDestacar(p.indices)} onBlur={() => onDestacar([])} onClick={() => onDestacar(p.indices)}>{p.texto}</button>
    </li>
  )
  const lista = (ids) => ids.map((id) => nomes[id] ?? id).join(', ')

  return (
    <div className="space-y-4" aria-label="Sugestões do Content para a grade">
      <div>
        <p className="text-sm">Nota de harmonia dos 12 primeiros posts: <strong data-nota={atual.nota}>{atual.nota} de 100</strong></p>
        <p className="text-xs text-gray-500">Régua editorial sobre cor e luz das imagens. Não prevê alcance nem curtida, e a leitura de cor é aproximada. Vale o seu olho no final.</p>
      </div>

      {atual.problemas.length > 0
        ? (
          <div aria-label="O que pesa na nota" className="space-y-1">
            <ul className="space-y-1">{ordenados.slice(0, MOSTRAR).map(item)}</ul>
            {ordenados.length > MOSTRAR && (
              <details>
                <summary className="min-h-11 py-2.5 text-sm cursor-pointer text-gray-700">Mais {ordenados.length - MOSTRAR} pontos de menor peso</summary>
                <ul className="space-y-1">{ordenados.slice(MOSTRAR).map((p, i) => item(p, i + MOSTRAR))}</ul>
              </details>
            )}
          </div>
        )
        : (
          <div className="text-sm text-gray-700">
            <p>Nenhum ponto de atenção nos 12 primeiros posts.</p>
            <p className="text-xs text-gray-500">Contei {atual.fortes} {atual.fortes === 1 ? 'post' : 'posts'} de cor forte (a partir de {Math.round(atual.corte * 100)} de barulho, o terço mais forte deste feed) e nenhum encosta em outro. Marque "Mostrar o que o Content leu" para conferir a leitura de cada imagem.</p>
          </div>
        )}

      {(ordem || fixar || fundos.length > 0) && <h3 className="text-sm font-medium">O que dá para fazer de verdade</h3>}

      {ordem && (
        <section className="space-y-1" aria-label="Ordem dos posts novos">
          <p className="text-sm">Trocar a ordem dos posts novos leva a nota de {atual.nota} para <strong>{ordem.nota}</strong>: {lista(ordem.ids)} (do primeiro lugar da grade para o último).</p>
          <button type="button" className={botao} onClick={() => onOrdem(ordem.ids)}>Aplicar essa ordem</button>
        </section>
      )}

      {fixar && (
        <section className="space-y-1" aria-label="Posts para fixar">
          <p className="text-sm">Fixar {fixar.ids.length === 1 ? 'este post' : 'estes posts'} no topo do perfil leva a nota para <strong>{fixar.nota}</strong>: {lista(fixar.ids)}.</p>
          <p className="text-xs text-gray-500">O Instagram deixa fixar até 3. Aplicar aqui só simula; para valer, fixe no app.</p>
          <button type="button" className={botao} onClick={() => onFixar(fixar.ids)}>Simular esses fixados</button>
        </section>
      )}

      {fundos.map((f) => (
        <section key={f.id} className="space-y-1" aria-label={`Fundo de ${nomes[f.id] ?? f.id}`}>
          <p className="text-sm">{nomes[f.id] ?? f.id}: trocar o fundo de {nomeDaCor(f.fundoAtual)} para <strong>{nomeDaCor(f.fundo)}</strong> leva a nota para <strong>{f.nota}</strong>.{f.mudouTexto ? ' A cor do texto muda junto para manter a leitura.' : ''}</p>
          <button type="button" className={botao} disabled={bloqueado} onClick={() => onFundo(f.id, f.slide)}>Aplicar no card 1</button>
        </section>
      ))}

      {!ordem && !fixar && fundos.length === 0 && atual.problemas.length > 0 && (
        <p className="text-sm text-gray-700">Não achei uma troca que melhore a nota com o que está disponível agora. Posts com foto ou cartões da coleção não têm fundo para trocar aqui.</p>
      )}

      <section className="space-y-1 border-t border-gray-100 pt-3" aria-label="Ordem ideal, só simulação">
        <p className="text-sm">Reordenando tudo, inclusive o que já está publicado, a nota chegaria a <strong>{ideal.nota}</strong>.</p>
        <p className="text-xs text-gray-500">O Instagram mostra os posts por data, então essa ordem só existe aqui. Para chegar perto dela no perfil, só com os fixados e repostando.</p>
        <button type="button" className={botao} aria-pressed={idealAtivo} onClick={onIdeal}>{idealAtivo ? 'Voltar para a grade real' : 'Ver a ordem ideal na grade'}</button>
      </section>
    </div>
  )
}
