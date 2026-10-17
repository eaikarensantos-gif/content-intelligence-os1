import { useEffect, useState } from 'react'
import { KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { CHAVES, aplicarCofre, apagarDoCofre, chaveDoAparelho, listarCofre, salvarNoCofre } from '../../lib/cofre'

/** Chaves de API guardadas no Content: valem em qualquer aparelho até ela apagar. */
export default function CofreChaves() {
  const [noCofre, setNoCofre] = useState(null)
  const [digitadas, setDigitadas] = useState({})
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')

  const atualizar = (chaves) => { setNoCofre(chaves); aplicarCofre(chaves) }
  useEffect(() => { listarCofre().then(atualizar).catch((e) => { setErro(e.message); setNoCofre({}) }) }, [])

  const rodar = async (nome, fn) => {
    setOcupado(nome)
    setErro('')
    try {
      atualizar(await fn())
      setDigitadas((d) => ({ ...d, [nome]: '' }))
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado('')
    }
  }

  const salvar = (nome, valor) => rodar(nome, () => salvarNoCofre(nome, valor))
  const apagar = (c) => {
    if (window.confirm(`Apagar a chave ${c.rotulo} do Content? Os aparelhos sem chave própria deixam de usar.`)) rodar(c.nome, () => apagarDoCofre(c.nome))
  }
  const doAparelho = noCofre ? CHAVES.filter((c) => !noCofre[c.nome] && chaveDoAparelho(c.nome)) : []
  const guardarTodas = async () => {
    for (const c of doAparelho) await salvar(c.nome, chaveDoAparelho(c.nome))
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <ShieldCheck size={15} className="text-emerald-500" /> Chaves fixas no Content
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Salve cada chave uma vez: ela fica no servidor do Content e vale em qualquer aparelho até você apagar. O navegador nunca recebe a chave de volta, só o final dela.
        </p>
      </div>

      {doAparelho.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-700">Este aparelho tem {doAparelho.length === 1 ? 'uma chave' : `${doAparelho.length} chaves`} que ainda não {doAparelho.length === 1 ? 'está' : 'estão'} no Content: {doAparelho.map((c) => c.rotulo).join(', ')}.</span>
          <button type="button" onClick={guardarTodas} disabled={!!ocupado} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60">Guardar no Content</button>
        </div>
      )}

      {noCofre === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" />Abrindo o cofre…</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {CHAVES.map((c) => {
            const salva = noCofre[c.nome]
            return (
              <div key={c.nome} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><KeyRound size={13} className="text-gray-400" />{c.rotulo}</div>
                  <div className="text-xs text-gray-500">{c.ajuda}</div>
                </div>
                {salva ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-50 rounded px-2 py-1">salva {salva.final}</span>
                    <button type="button" onClick={() => apagar(c)} disabled={!!ocupado} title="Apagar do Content" className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="password" autoComplete="off" placeholder="cole a chave" value={digitadas[c.nome] ?? ''}
                      onChange={(e) => setDigitadas((d) => ({ ...d, [c.nome]: e.target.value }))}
                      className="w-44 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                    <button type="button" onClick={() => salvar(c.nome, digitadas[c.nome])} disabled={!!ocupado || (digitadas[c.nome] ?? '').trim().length < 10}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                      {ocupado === c.nome ? <Loader2 size={13} className="animate-spin" /> : 'Salvar'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  )
}
