import { useState } from 'react'

export default function SugestoesLayout({ arte, resultado, analisando, onAnalisar, onAplicar, renderizar, tamanho }) {
  const [aberto, setAberto] = useState(false)
  const valido = resultado?.origem === arte
  return (
    <section className="rounded-xl border border-orange-200 bg-white p-3 space-y-2" aria-label="Sugestões de layout">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="text-sm font-semibold text-left min-h-11" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>Sugestões de layout {valido ? `(${resultado.opcoes.length})` : ''}</button>
        <button type="button" disabled={analisando} onClick={() => { setAberto(true); onAnalisar() }} className="min-h-11 px-3 text-xs text-orange-800 border border-orange-200 rounded-lg disabled:opacity-50">{analisando ? 'Conferindo…' : valido ? 'Reavaliar' : 'Sugerir layouts'}</button>
      </div>
      {valido && resultado.problemas.length > 0 && <p role="status" className="text-xs text-amber-800">{resultado.problemas.join('. ')}. Revise o texto ou escolha uma opção conferida.</p>}
      {aberto && <>
        {!valido && <p className="text-xs text-gray-500">{resultado ? 'A arte mudou. Reavalie para conferir o conteúdo atual.' : 'Compara função do slide, quantidade de texto, fotos e formato; depois confere o texto na prévia.'}</p>}
        {valido && !resultado.opcoes.length && <p className="text-sm text-gray-600">Nenhum layout passou na conferência. O conteúdo foi mantido. Reduza o texto ou divida-o em mais slides e tente novamente.</p>}
        {valido && resultado.opcoes.map((opcao, i) => {
          const t = tamanho(opcao.slide)
          return <div key={opcao.id} className="flex gap-3 border-t border-gray-100 pt-3" data-layout-sugestao={opcao.id}>
            <div className="shrink-0 overflow-hidden rounded border border-gray-200" style={{ width: 80, height: t.h * 80 / t.w }}>
              <div style={{ transform: `scale(${80 / t.w})`, transformOrigin: 'top left', width: t.w, height: t.h, pointerEvents: 'none' }}>{renderizar(opcao.slide)}</div>
            </div>
            <div className="min-w-0 text-xs space-y-1">
              <p className="font-semibold">{i + 1}. {opcao.nome}</p>
              <p className="text-gray-500">Afinidade editorial: {opcao.pontos}/100</p>
              <p className="text-gray-600">{opcao.motivos.join(' · ')}</p>
              <button type="button" onClick={() => onAplicar(opcao)} className="min-h-11 text-orange-800 font-medium">Usar este layout</button>
            </div>
          </div>
        })}
      </>}
    </section>
  )
}
