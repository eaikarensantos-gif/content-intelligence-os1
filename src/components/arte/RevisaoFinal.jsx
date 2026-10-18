import { mesmaArte } from './exportacaoArte'
export default function RevisaoFinal({ revisao, atual, bloqueado, onRevisar, onCorrigir, onAbrir, onBaixar }) {
  if (!revisao) return null
  const valido = mesmaArte(revisao.origem, atual)
  return <section aria-label="Revisão antes de baixar" className="border border-orange-200 rounded-xl p-4 mb-4 space-y-3">
    <h2 className="font-semibold text-sm">Revisão antes de baixar</h2>
    <div className="max-h-72 overflow-y-auto space-y-2">
    {!valido ? <p className="text-sm">A arte mudou. Revise novamente antes de baixar.</p> : revisao.cards.map(c => <div key={c.indice} className="border-t pt-2 text-sm">
      <button className="font-medium underline" onClick={() => onAbrir(c.indice)}>Card {c.indice + 1}</button>
      {c.problemas.length ? <><ul className="list-disc ml-5">{c.problemas.map(p => <li key={p}>{p}</li>)}</ul><button disabled={bloqueado} className="text-orange-800 underline py-2" onClick={() => onCorrigir(c.indice)}>Sugerir ajuste de layout</button></> : <p className="text-green-700">Sem problemas detectados.</p>}
    </div>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <button disabled={bloqueado} className="border rounded-lg px-3 py-2 text-sm" onClick={onRevisar}>Revisar novamente</button>
      <button disabled={!valido || bloqueado} className="bg-orange-500 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-40" onClick={onBaixar}>{revisao.cards.some(c => c.problemas.length) ? 'Conferi os avisos · baixar' : 'Baixar arquivos revisados'}</button>
    </div>
  </section>
}
