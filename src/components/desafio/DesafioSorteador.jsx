import { useMemo, useState } from 'react'
import { CalendarDays, Check, Clipboard, Copy, ListChecks } from 'lucide-react'
import useStore from '../../store/useStore'

const EMPTY_DRAFT = {
  perguntaContagem: '', conta: '', naoConta: '', faixaBaixa: '', faixaMedia: '',
  faixaAlta: '', ponte: '', fissura: '', dataPublicacao: '',
}

const COUNT_PATTERN = /\b(quant(?:o|a|os|as)|n[uú]mero|horas?|vezes|clientes?|projetos?|decis(?:ão|ões)|dias?|semanas?|meses?)\b/i
const BRIDGE_PATTERN = /\b(perfil|bio|link|direct|dm|mensagem|baix|abr|agenda|lista|biblioteca|coment[aá]rio fixado)\b/i
const csvList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean)

function validateDraft(draft) {
  const errors = {}
  if (!COUNT_PATTERN.test(draft.perguntaContagem)) errors.perguntaContagem = 'A capa precisa ser respondível com um número.'
  if (!csvList(draft.conta).length || !csvList(draft.naoConta).length) errors.regua = 'Defina o que conta e o que não conta.'
  if (!draft.faixaBaixa.trim() || !draft.faixaMedia.trim() || !draft.faixaAlta.trim()) errors.faixas = 'Preencha as três leituras do resultado.'
  if (!BRIDGE_PATTERN.test(draft.ponte)) errors.ponte = 'A ponte precisa mandar para uma ação fora do post.'
  if (!draft.fissura.trim()) errors.fissura = 'Inclua uma fissura real em uma das leituras.'
  if (!draft.dataPublicacao) errors.dataPublicacao = 'Defina a data de publicação.'
  return errors
}

function toBriefing(draft, ordem) {
  return {
    tipo: 'carrossel-contagem', ordem, status: 'fila',
    perguntaContagem: draft.perguntaContagem.trim(),
    regua: { conta: csvList(draft.conta), naoConta: csvList(draft.naoConta) },
    faixas: { baixa: draft.faixaBaixa.trim(), media: draft.faixaMedia.trim(), alta: draft.faixaAlta.trim() },
    ponte: draft.ponte.trim(), fissura: draft.fissura.trim(),
    dataPublicacao: draft.dataPublicacao,
    formato: 'Carrossel de exercício · 7 slides',
    data: new Date().toLocaleDateString('pt-BR'),
  }
}

function buildPrompt(item) {
  return `Crie um carrossel de exercício para Karen Santos usando apenas os dados deste briefing.

BRIEFING
${JSON.stringify(item, null, 2)}

REGRAS
- Entregue exatamente 7 slides em JSON.
- Slide 1: pergunta de contagem, respondível com número.
- Slide 2: por que a resposta não vem de cabeça, em até duas linhas.
- Slide 3: régua com o que conta e o que não conta.
- Slide 4: execução em cinco minutos, usando papel ou notas.
- Slide 5: leitura da faixa baixa.
- Slide 6: leitura das faixas média e alta. A fissura entra no slide 5 ou 6, sem dramatização.
- Slide 7: ponte com ação fora do post. Não use pergunta aberta.
- Não invente dado, caso ou experiência de Karen.
- Evite oposição estilizada, ritmo de sermão, travessão dramático e fechamento motivacional.

Responda apenas com este JSON:
{"capa":"","porQueNinguemSabe":"","regua":{"conta":[],"naoConta":[]},"execucao":"","faixaBaixa":{"leitura":"","fissura":""},"faixaMediaAlta":{"media":"","alta":"","fissura":""},"ponte":""}`
}

function Field({ label, error, ...props }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <textarea {...props} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-100 ${error ? 'border-red-300' : 'border-gray-200 focus:border-orange-300'}`} />
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </label>
  )
}

export default function DesafioSorteador() {
  const history = useStore((s) => s.desafioHistory)
  const addDesafio = useStore((s) => s.addDesafio)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [errors, setErrors] = useState({})
  const [copied, setCopied] = useState(null)

  const queue = useMemo(() => history.filter((item) => item.tipo === 'carrossel-contagem'), [history])
  const complete = queue.length >= 8
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const addToQueue = () => {
    const nextErrors = validateDraft(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || complete) return
    addDesafio(toBriefing(draft, queue.length + 1))
    setDraft(EMPTY_DRAFT)
  }

  const copyBriefing = async (item) => {
    await navigator.clipboard.writeText(buildPrompt(item))
    setCopied(item.ordem)
    setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border border-orange-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2"><ListChecks size={17} className="text-orange-500" /><h2 className="text-base font-bold text-gray-900">Esteira de exercícios · 8 semanas</h2></div>
            <p className="text-sm text-gray-500 max-w-2xl">A pauta entra manualmente, com a régua que veio do seu trabalho real. Sem sorteio de formato: durante oito semanas, a amostra fica comparável.</p>
          </div>
          <span className="chip bg-white border border-orange-200 text-orange-700 text-xs">{queue.length}/8 na fila</span>
        </div>
      </div>

      {!complete && (
        <div className="card p-5 space-y-4">
          <Field label="Pergunta de contagem · capa" rows={2} value={draft.perguntaContagem} onChange={(e) => update('perguntaContagem', e.target.value)} error={errors.perguntaContagem} placeholder="Quantas das suas últimas 10 decisões de trabalho foram tomadas com informação?" />
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="O que conta · separe por vírgula" rows={3} value={draft.conta} onChange={(e) => update('conta', e.target.value)} error={errors.regua} />
            <Field label="O que não conta · separe por vírgula" rows={3} value={draft.naoConta} onChange={(e) => update('naoConta', e.target.value)} error={errors.regua} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Leitura · faixa baixa" rows={3} value={draft.faixaBaixa} onChange={(e) => update('faixaBaixa', e.target.value)} error={errors.faixas} />
            <Field label="Leitura · faixa média" rows={3} value={draft.faixaMedia} onChange={(e) => update('faixaMedia', e.target.value)} error={errors.faixas} />
            <Field label="Leitura · faixa alta" rows={3} value={draft.faixaAlta} onChange={(e) => update('faixaAlta', e.target.value)} error={errors.faixas} />
          </div>
          <Field label="Fissura real" rows={2} value={draft.fissura} onChange={(e) => update('fissura', e.target.value)} error={errors.fissura} placeholder="Uma frase curta sobre onde a sua própria contagem não fechou bem." />
          <Field label="Ponte · ação fora do post" rows={2} value={draft.ponte} onChange={(e) => update('ponte', e.target.value)} error={errors.ponte} placeholder="A planilha completa está no link da bio." />
          <label className="space-y-1.5 block max-w-xs">
            <span className="text-xs font-semibold text-gray-700">Data de publicação</span>
            <input type="date" value={draft.dataPublicacao} onChange={(e) => update('dataPublicacao', e.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-sm ${errors.dataPublicacao ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.dataPublicacao && <span className="text-[11px] text-red-600">{errors.dataPublicacao}</span>}
          </label>
          <button onClick={addToQueue} className="btn-primary"><Clipboard size={14} /> Adicionar à fila</button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ordem de publicação</span>
        </div>
        {queue.length === 0 ? <div className="card p-8 text-center text-sm text-gray-400">A fila começa vazia. O app não inventa as perguntas.</div> : (
          <div className="card divide-y divide-gray-100">
            {queue.map((item) => (
              <div key={`${item.ordem}-${item.dataPublicacao}`} className="p-4 flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">{item.ordem}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.perguntaContagem}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><CalendarDays size={11} /> {item.dataPublicacao}</p>
                </div>
                <button onClick={() => copyBriefing(item)} className="btn-secondary text-xs">{copied === item.ordem ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar prompt</>}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

