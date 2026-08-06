import { useState } from 'react'
import { Compass, Plus, Trash2, X } from 'lucide-react'
import useStore from '../../store/useStore'

function Section({ title, hint, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

const TEXTAREA_CLS = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 placeholder:text-gray-300 resize-none'
const INPUT_CLS = 'w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 placeholder:text-gray-300'

function TextField({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={TEXTAREA_CLS}
    />
  )
}

function ListaNegraBox() {
  const listaNegra = useStore((s) => s.posicionamento.lista_negra)
  const addListaNegra = useStore((s) => s.addListaNegra)
  const removeListaNegra = useStore((s) => s.removeListaNegra)
  const [value, setValue] = useState('')

  const submit = () => { if (value.trim()) { addListaNegra(value.trim()); setValue('') } }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder='Ex: "dica solta", "hype como gancho", "Em resumo"'
          className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 placeholder:text-gray-300"
        />
        <button
          type="button"
          onClick={submit}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1"
        >
          <Plus size={12} /> Banir
        </button>
      </div>
      {listaNegra.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {listaNegra.map((phrase) => (
            <span key={phrase} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-100 text-[11px] text-red-700">
              "{phrase.length > 40 ? `${phrase.slice(0, 40)}...` : phrase}"
              <button type="button" onClick={() => removeListaNegra(phrase)} className="text-red-300 hover:text-red-600">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PublicosSection() {
  const publicos = useStore((s) => s.posicionamento.publicos)
  const addPublico = useStore((s) => s.addPublico)
  const updatePublico = useStore((s) => s.updatePublico)
  const removePublico = useStore((s) => s.removePublico)

  return (
    <div className="space-y-3">
      {publicos.map((p) => (
        <div key={p.id} className="border border-gray-100 rounded-xl p-3 space-y-2 relative">
          <button
            type="button"
            onClick={() => removePublico(p.id)}
            className="absolute top-2.5 right-2.5 text-gray-300 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
          <div className="grid grid-cols-2 gap-2 pr-6">
            <input value={p.nome} onChange={(e) => updatePublico(p.id, { nome: e.target.value })} placeholder="Nome do público" className={INPUT_CLS} />
            <select value={p.papel} onChange={(e) => updatePublico(p.id, { papel: e.target.value })} className={INPUT_CLS}>
              <option value="nucleo">Núcleo</option>
              <option value="topo-funil">Topo de funil</option>
            </select>
          </div>
          <input value={p.descricao} onChange={(e) => updatePublico(p.id, { descricao: e.target.value })} placeholder="Descrição curta" className={INPUT_CLS} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => addPublico({})}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800"
      >
        <Plus size={12} /> Adicionar público
      </button>
    </div>
  )
}

function AtivosSection() {
  const ativos = useStore((s) => s.posicionamento.ativos)
  const addAtivo = useStore((s) => s.addAtivo)
  const updateAtivo = useStore((s) => s.updateAtivo)
  const removeAtivo = useStore((s) => s.removeAtivo)

  return (
    <div className="space-y-2">
      {ativos.map((a) => (
        <div key={a.id} className="flex gap-2 items-center">
          <input value={a.rotulo} onChange={(e) => updateAtivo(a.id, { rotulo: e.target.value })} placeholder="Ex: Forbes Under 30" className={`${INPUT_CLS} flex-1`} />
          <input value={a.prova} onChange={(e) => updateAtivo(a.id, { prova: e.target.value })} placeholder="Prova/detalhe" className={`${INPUT_CLS} flex-1`} />
          <button type="button" onClick={() => removeAtivo(a.id)} className="text-gray-300 hover:text-red-500 shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAtivo({})}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800"
      >
        <Plus size={12} /> Adicionar ativo
      </button>
    </div>
  )
}

function PilaresSection() {
  const pilares = useStore((s) => s.posicionamento.pilares)
  const addPilar = useStore((s) => s.addPilar)
  const updatePilar = useStore((s) => s.updatePilar)
  const removePilar = useStore((s) => s.removePilar)

  return (
    <div className="space-y-3">
      {pilares.map((p, i) => (
        <div key={p.id} className="border border-gray-100 rounded-xl p-3 space-y-2 relative">
          <button
            type="button"
            onClick={() => removePilar(p.id)}
            className="absolute top-2.5 right-2.5 text-gray-300 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
          <div className="flex items-center gap-2 pr-6">
            <span className="text-[10px] font-semibold text-violet-400 shrink-0">Pilar {i + 1}</span>
            <input value={p.nome} onChange={(e) => updatePilar(p.id, { nome: e.target.value })} placeholder="Nome do pilar" className={`${INPUT_CLS} font-medium`} />
          </div>
          <input value={p.objetivo} onChange={(e) => updatePilar(p.id, { objetivo: e.target.value })} placeholder="Objetivo" className={INPUT_CLS} />
          <div className="grid grid-cols-2 gap-2">
            <input value={p.formato_preferido} onChange={(e) => updatePilar(p.id, { formato_preferido: e.target.value })} placeholder="Formato preferido" className={INPUT_CLS} />
            <input value={p.gancho_tipico} onChange={(e) => updatePilar(p.id, { gancho_tipico: e.target.value })} placeholder="Gancho típico" className={INPUT_CLS} />
          </div>
          <input value={p.exemplo} onChange={(e) => updatePilar(p.id, { exemplo: e.target.value })} placeholder="Exemplo" className={INPUT_CLS} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => addPilar({})}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800"
      >
        <Plus size={12} /> Adicionar pilar
      </button>
    </div>
  )
}

export default function PositioningStudio() {
  const posicionamento = useStore((s) => s.posicionamento)
  const setPosicionamento = useStore((s) => s.setPosicionamento)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Compass className="text-violet-500" size={24} />
          Posicionamento
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          A fonte única da sua identidade de marca — alimenta a Diretriz de Marca, a lista negra e
          toda geração de conteúdo do app.
        </p>
      </div>

      <Section title="Diretriz de Marca" hint="O resumo curto que aparece no banner de todos os editores.">
        <TextField
          value={posicionamento.diretriz_marca}
          onChange={(v) => setPosicionamento({ diretriz_marca: v })}
          placeholder="Ex: Tom Sênior & Observacional — sem estruturas de massa, coaching vazio ou clickbait."
          rows={2}
        />
      </Section>

      <Section title="Âncora" hint="A ideia central que todo conteúdo reforça.">
        <TextField
          value={posicionamento.ancora}
          onChange={(v) => setPosicionamento({ ancora: v })}
          placeholder="Ex: IA aplicada ao negócio explicada por quem entende a lógica de decisão, não por quem lista ferramenta."
        />
      </Section>

      <Section title="Públicos" hint="Quem você fala com — núcleo (ticket alto) e topo de funil.">
        <PublicosSection />
      </Section>

      <Section title="Concorrência / espaço vago" hint="O que os outros fazem, e o espaço que sobra pra você.">
        <TextField
          value={posicionamento.concorrencia_espaco_vago}
          onChange={(v) => setPosicionamento({ concorrencia_espaco_vago: v })}
          placeholder="Ex: creator de hype (ferramenta do dia, prompt, medo). Espaço lotado e raso."
        />
      </Section>

      <Section title="Ativos comprováveis" hint="Prêmios, métricas e provas que sustentam a autoridade.">
        <AtivosSection />
      </Section>

      <Section title="Pilares" hint="Os temas que você sempre volta — selecionáveis ao criar uma ideia.">
        <PilaresSection />
      </Section>

      <Section title="Lista negra" hint="Frases e estruturas banidas — vale pra todos os geradores do app.">
        <ListaNegraBox />
      </Section>

      <Section title="Teste de coerência" hint="A pergunta única que valida se um rascunho reforça ou dilui seu posicionamento.">
        <TextField
          value={posicionamento.teste_coerencia}
          onChange={(v) => setPosicionamento({ teste_coerencia: v })}
          placeholder="Ex: Esse conteúdo aumenta ou dilui a associação de estrategista de IA com critério de negócio?"
          rows={2}
        />
      </Section>

      <Section title="Trade-off aceito" hint="O que você abre mão em troca do posicionamento — pra não se desviar por atalho.">
        <TextField
          value={posicionamento.trade_off}
          onChange={(v) => setPosicionamento({ trade_off: v })}
          placeholder="Ex: crescimento mais lento, monetização por ticket alto e autoridade, não por volume."
          rows={2}
        />
      </Section>
    </div>
  )
}
