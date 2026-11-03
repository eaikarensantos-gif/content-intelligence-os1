import { CORES } from './marca'

export const Cores = ({ valor, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {Object.entries(CORES).map(([k, c]) => (
      <button key={k} type="button" title={c.nome} aria-label={c.nome} aria-pressed={valor === k} onClick={() => onChange(k)} className="w-11 h-11 flex items-center justify-center rounded-full">
        <span className={`block w-7 h-7 rounded-full border ${valor === k ? 'ring-2 ring-offset-1 ring-orange-500' : 'border-gray-300'}`} style={{ background: c.hex }} />
      </button>
    ))}
  </div>
)

export const Campo = ({ rotulo, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-500 mb-1">{rotulo}</span>
    {children}
  </label>
)

export const Faixa = ({ rotulo, valor, min, max, passo = 1, onChange }) => (
  <Campo rotulo={`${rotulo}: ${valor}`}>
    <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
  </Campo>
)
