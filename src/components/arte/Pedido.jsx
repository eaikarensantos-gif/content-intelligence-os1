import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square, Wand2 } from 'lucide-react'
import { pedirArte } from './pedido'
import { SEM_CHAVE } from '../../utils/apiError'

// Ditado pelo próprio navegador (Chrome, Edge, Safari): sem servidor e sem custo de transcrição.
const Reconhecimento = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

/** Caixa onde ela escreve ou fala como quer a arte. Devolve a resposta da IA para o Studio montar. */
export default function Pedido({ onResposta, desfazer }) {
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')
  const [chave, setChave] = useState('')
  const rec = useRef(null)

  // Mesma chave que as outras telas do Content usam (localStorage 'cio-openai-key').
  const salvarChave = () => {
    try { localStorage.setItem('cio-openai-key', chave.trim()) } catch { /* sem armazenamento */ }
    setChave('')
    setErro('')
  }
  const base = useRef('')

  useEffect(() => () => rec.current?.abort(), [])

  const falar = () => {
    if (ouvindo) return rec.current?.stop()
    setErro('')
    const r = new Reconhecimento()
    r.lang = 'pt-BR'
    r.continuous = true
    r.interimResults = true
    base.current = texto ? `${texto.trim()} ` : ''
    r.onresult = (e) => {
      let dito = ''
      for (let i = 0; i < e.results.length; i++) dito += e.results[i][0].transcript
      setTexto(base.current + dito.trim())
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed') setErro('O navegador bloqueou o microfone. Libere o acesso nas permissões do site.')
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setErro(`O ditado parou (${e.error}).`)
    }
    r.onend = () => setOuvindo(false)
    rec.current = r
    r.start()
    setOuvindo(true)
  }

  const criar = async () => {
    rec.current?.stop()
    setCriando(true)
    setErro('')
    try {
      onResposta(await pedirArte(texto.trim()))
    } catch (err) {
      setErro(err?.message ?? String(err))
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
      <label htmlFor="pedido-arte" className="block text-sm font-semibold text-gray-900 mb-1">Descreva a arte</label>
      <p className="text-xs text-gray-500 mb-2">
        Escreva ou fale como você quer: quantos slides, o texto de cada um, cores, se vai foto. Para usar uma foto, coloque ela antes no slide atual.
      </p>
      <textarea id="pedido-arte" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="carrossel de 4 slides sobre organizar a semana. capa com minha foto e a palavra segunda atrás da cabeça, fundo café. depois três dicas curtas em cor cheia mostarda."
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {Reconhecimento && (
          <button type="button" onClick={falar} disabled={criando}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border ${ouvindo ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
            {ouvindo ? <><Square size={14} />Parar</> : <><Mic size={15} />Falar</>}
          </button>
        )}
        <button type="button" onClick={criar} disabled={criando || !texto.trim()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
          {criando ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}{criando ? 'Criando…' : 'Criar arte'}
        </button>
        {desfazer && <button type="button" onClick={desfazer} className="text-sm text-gray-600 hover:underline">Voltar para a arte anterior</button>}
        {ouvindo && <span className="text-xs text-red-600">Ouvindo… fale e clique em Parar.</span>}
        {!Reconhecimento && <span className="text-xs text-gray-500">Para falar, use o microfone do teclado do celular ou abra no Chrome.</span>}
      </div>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      {erro === SEM_CHAVE && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input type="password" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="sk-…" autoComplete="off"
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <button type="button" onClick={salvarChave} disabled={!chave.trim().startsWith('sk-')}
            className="px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">Salvar chave neste aparelho</button>
        </div>
      )}
    </div>
  )
}
