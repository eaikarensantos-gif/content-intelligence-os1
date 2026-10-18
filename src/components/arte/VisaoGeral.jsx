import { useState } from 'react'
import { CORES, FONTES } from './marca'

export default function VisaoGeral({ projeto, renderizar, tamanho, onReordenar, onAbrir, onLote, onExportar, bloqueado }) {
  const [selecionados, setSelecionados] = useState([])
  const [arrastado, setArrastado] = useState(null)
  const [fonte, setFonte] = useState('')
  const [cor, setCor] = useState('')
  const [fundo, setFundo] = useState('')
  const [assinatura, setAssinatura] = useState('')
  const [usarAssinatura, setUsarAssinatura] = useState(false)
  const [numeracao, setNumeracao] = useState('')
  const indices = selecionados.filter(i => i < projeto.slides.length)
  const botao = 'px-3 py-2 min-h-10 border rounded-lg text-sm disabled:opacity-40'
  return <details className="mb-4 border rounded-xl p-3" aria-label="Visão geral do carrossel">
    <summary className="font-semibold text-sm cursor-pointer">Visão geral · organizar, ajustar e baixar vários cards</summary>
    <div className="space-y-4 mt-4">
      <p className="text-xs text-gray-500">Arraste para reorganizar ou use as setas. Selecione os cards para ajustar ou baixar juntos.</p>
      <div className="flex flex-wrap gap-2">
        <button className={botao} disabled={bloqueado} onClick={() => setSelecionados(projeto.slides.map((_, i) => i))}>Selecionar todos</button>
        <button className={botao} onClick={() => setSelecionados([])}>Limpar seleção</button>
        <button className={botao} disabled={bloqueado || !indices.length} onClick={() => onExportar(indices)}>Baixar selecionados em ZIP ({indices.length})</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[65vh] overflow-auto">
        {projeto.slides.map((s, i) => {
          const { w, h } = tamanho(s)
          return <div key={i} className="border rounded-xl p-2 bg-white min-w-0" draggable={!bloqueado} onDragStart={() => setArrastado(i)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (arrastado != null) { onReordenar(arrastado, i); setSelecionados([]) }; setArrastado(null) }} onDragEnd={() => setArrastado(null)}>
            <label className="flex gap-2 items-center text-sm mb-2"><input type="checkbox" checked={indices.includes(i)} onChange={e => setSelecionados(e.target.checked ? [...indices, i] : indices.filter(j => j !== i))} />Card {i + 1}</label>
            <button className="block overflow-hidden mx-auto" aria-label={`Editar card ${i + 1}`} onClick={() => onAbrir(i)} style={{ width: '100%', maxWidth: 240 }}><svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ pointerEvents: 'none' }}><foreignObject width={w} height={h}>{renderizar(s, i)}</foreignObject></svg></button>
            <div className="flex justify-between mt-2"><button className={botao} disabled={bloqueado || !i} aria-label={`Mover card ${i + 1} para antes`} onClick={() => { onReordenar(i, i - 1); setSelecionados([]) }}>←</button><button className={botao} disabled={bloqueado || i === projeto.slides.length - 1} aria-label={`Mover card ${i + 1} para depois`} onClick={() => { onReordenar(i, i + 1); setSelecionados([]) }}>→</button></div>
          </div>
        })}
      </div>
      <fieldset className="border rounded-xl p-3 space-y-3" disabled={bloqueado}>
        <legend className="text-sm font-medium">Ajustes nos cards selecionados</legend>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">Fonte<select aria-label="Fonte em lote" className="block border rounded p-2" value={fonte} onChange={e => setFonte(e.target.value)}><option value="">Manter fontes</option>{Object.entries(FONTES).map(([id, f]) => <option key={id} value={id}>{f.nome}</option>)}</select></label>
          <label className="text-sm">Cor do texto<select aria-label="Cor em lote" className="block border rounded p-2" value={cor} onChange={e => setCor(e.target.value)}><option value="">Manter cores</option>{Object.entries(CORES).map(([id, c]) => <option key={id} value={id}>{c.nome}</option>)}</select></label>
          <label className="text-sm">Cor de fundo<select aria-label="Fundo em lote" className="block border rounded p-2" value={fundo} onChange={e => setFundo(e.target.value)}><option value="">Manter fundos</option>{Object.entries(CORES).map(([id, c]) => <option key={id} value={id}>{c.nome}</option>)}</select></label>
          <label className="text-sm">Numeração do carrossel<select className="block border rounded p-2" value={numeracao} onChange={e => setNumeracao(e.target.value)}><option value="">Manter</option><option value="sim">Numerar todos</option><option value="nao">Ocultar em todos</option></select></label>
        </div>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={usarAssinatura} onChange={e => setUsarAssinatura(e.target.checked)} />Aplicar assinatura</label>
        {usarAssinatura && <input className="border rounded p-2 w-full" aria-label="Assinatura" placeholder="@seuperfil (vazio remove)" maxLength={80} value={assinatura} onChange={e => setAssinatura(e.target.value)} />}
        <button className={botao} disabled={!indices.length || (!fonte && !cor && !fundo && !usarAssinatura && !numeracao)} onClick={() => onLote(indices, { ...(fonte ? { fonte } : {}), ...(cor ? { cor } : {}), ...(fundo ? { fundo } : {}), ...(usarAssinatura ? { assinatura } : {}), ...(numeracao ? { contador: numeracao === 'sim' } : {}) })}>Aplicar em {indices.length} card(s)</button>
        <p className="text-xs text-gray-500">Preserva textos, fotos e posições. O fundo não substitui fotos. Use Desfazer para reverter o conjunto de ajustes.</p>
      </fieldset>
    </div>
  </details>
}
