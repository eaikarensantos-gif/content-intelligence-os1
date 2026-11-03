import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { gerarLegenda, TIPOS_LEGENDA } from './legendaCarrossel'
import { GATES, LIMITE_ALT, LIMITE_LEGENDA, colchetes, gatesConferidos, pacoteDe, sugerirAlt } from './pacotePublicacao'

const campo = 'w-full border border-gray-200 rounded-lg px-2 py-2 text-sm'

/** Legenda, texto alternativo de cada card e checklist dos gates: tudo o que sai junto com o carrossel. */
export default function PacotePublicacao({ projeto, bloqueado, onLegenda, onGate, onAlt }) {
  const [tipo, setTipo] = useState('geral')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const { legenda, gates } = pacoteDe(projeto)
  const { slides } = projeto
  const pendentes = colchetes(legenda)

  const gerar = async () => {
    setGerando(true)
    setErro('')
    setAviso('')
    try {
      onLegenda(await gerarLegenda(projeto, tipo))
    } catch (err) {
      setErro(err?.message ?? String(err))
    } finally {
      setGerando(false)
    }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(legenda)
      setAviso('Legenda copiada.')
    } catch {
      setAviso('Não consegui copiar sozinho. Selecione o texto e copie.')
    }
  }

  const preencherAlts = () => slides.forEach((s, i) => { if (!(s.alt ?? '').trim()) onAlt(i, sugerirAlt(s, i, slides.length)) })

  return (
    <details className="mb-4 border border-gray-200 rounded-xl p-3" aria-label="Pacote de publicação">
      <summary className="font-semibold text-sm cursor-pointer py-2.5">Pacote de publicação · legenda, texto alternativo e checklist</summary>
      <div className="space-y-6 mt-3">
        <section aria-label="Legenda do carrossel" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="legenda-arte" className="text-sm font-medium">Legenda</label>
            <span className={`text-xs ${legenda.length > LIMITE_LEGENDA ? 'text-red-700' : 'text-gray-500'}`}>{legenda.length}/{LIMITE_LEGENDA}</span>
          </div>
          <textarea id="legenda-arte" rows={7} value={legenda} onChange={(e) => onLegenda(e.target.value)} className={campo} placeholder="Escreva a legenda ou peça um rascunho para a IA." />
          {pendentes.length > 0 && <p role="alert" className="text-sm text-red-700">Ainda tem trechos para preencher antes de publicar: {pendentes.join(', ')}.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Tipo de legenda" value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${campo} !w-auto min-h-11`}>
              {Object.entries(TIPOS_LEGENDA).map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}
            </select>
            <button type="button" onClick={gerar} disabled={bloqueado || gerando} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg bg-orange-700 text-white hover:bg-orange-800 disabled:opacity-40">
              {gerando && <Loader2 size={15} className="animate-spin" />}{gerando ? 'Escrevendo…' : 'Gerar legenda com IA'}
            </button>
            <button type="button" onClick={copiar} disabled={!legenda.trim()} className="min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Copiar legenda</button>
          </div>
          {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
          {aviso && <p role="status" className="text-sm text-gray-600">{aviso}</p>}
          <p className="text-xs text-gray-500">A IA organiza o que está nos cards e segue as regras de voz do sistema de conteúdo. Leia antes de publicar: nada garante que ela cumpriu todas. No carrossel de terça, a leitura fica em [SUA LEITURA] para você escrever.</p>
        </section>

        <section aria-label="Texto alternativo" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Texto alternativo de cada card</h3>
            <button type="button" onClick={preencherAlts} className="min-h-11 px-2 text-sm text-orange-800 underline">Preencher os vazios com sugestão</button>
          </div>
          {slides.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <label htmlFor={`alt-${i}`} className="w-16 shrink-0 text-xs text-gray-600">Card {i + 1}</label>
              <input id={`alt-${i}`} className={`${campo} min-h-11`} maxLength={LIMITE_ALT} value={s.alt ?? ''} placeholder={sugerirAlt(s, i, slides.length)} onChange={(e) => onAlt(i, e.target.value)} />
              <span className="w-12 shrink-0 text-right text-xs text-gray-500">{(s.alt ?? '').length}/{LIMITE_ALT}</span>
            </div>
          ))}
          <p className="text-xs text-gray-500">A sugestão só repete o texto do card. Quando houver foto, descreva o que aparece nela.</p>
        </section>

        <section aria-label="Checklist antes de publicar" className="space-y-1">
          <h3 className="text-sm font-medium">Checklist antes de publicar ({gatesConferidos(projeto)} de {GATES.length})</h3>
          {GATES.map((g) => (
            <label key={g.id} className="flex items-start gap-2 min-h-11 py-1 text-sm">
              <input type="checkbox" className="mt-1" checked={!!gates[g.id]} onChange={(e) => onGate(g.id, e.target.checked)} />
              <span><strong className="font-medium">{g.titulo}.</strong> {g.pergunta}</span>
            </label>
          ))}
        </section>

        <p className="text-xs text-gray-500">Baixar todos (ZIP) leva legenda.txt e alt-text.txt junto, quando estiverem preenchidos.</p>
      </div>
    </details>
  )
}
