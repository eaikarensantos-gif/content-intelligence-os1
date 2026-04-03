import { useState } from 'react'
import { Loader2, Copy, Check, Volume2 } from 'lucide-react'
import clsx from 'clsx'

// Gerar transcript dinâmico baseado no título da referência
const generateTranscript = (reference) => {
  const title = reference.title.toLowerCase()

  // Detectar tema pela referência
  if (title.includes('imposter') || title.includes('síndrome')) {
    return `"Imposter syndrome não é um diagnóstico. É um sintoma de um ambiente que não reconhece seu trabalho.

A gente internaliza a culpa de coisas que não são culpa nossa. Você entrega projeto? 'Mas será que foi bom o suficiente?' Você resolve problema? 'Mas será que alguém mais teria resolvido melhor?'

Isso não é humildade. É falta de feedback claro.

E aí vem a real: quando você muda de ambiente e de repente a galera te reconhece, aquela síndrome desaparece. Porque o problema nunca foi você. Era o lugar.

Então a próxima vez que você sentir que é fraude, pergunte: 'Ou eu só estou num lugar que não sabe o que tem?'"`;
  }

  if (title.includes('fit cultural') || title.includes('processo seletivo') || title.includes('rh')) {
    return `"A gente precisa parar de normalizando a frustração no ambiente corporativo.

Aquilo que a gente chama de 'fit cultural' é geralmente o chefe querendo controlar como você pensa, como você age, até como você se veste.

Mas aí vem o problema: se você não se encaixa no padrão, você está errado? Não. O ambiente é que está errado.

O que eu recomendo é olhar pro seu histórico. Quantos projetos você entregou? Quantas pessoas você desenvolveu? Se isso não for reconhecido, o problema não é você."`;
  }

  if (title.includes('ia') || title.includes('automação') || title.includes('claude')) {
    return `"Olha, IA não tá tomando seu lugar não. Você que tá usando ela errado.

Eu testei esse novo modelo pra gerar um plano de conteúdo que me levaria 2 horas. Ficou pronto em 30 segundos.

Agora em vez de gastar 2 horas com tarefa chata, eu gasto 30 minutos refinando o que saiu.

A real: quem usar IA bem vai ficar rico. Quem ignorar vai ficar obsoleto."`;
  }

  if (title.includes('cachorro') || title.includes('animal') || title.includes('reunião')) {
    return `"Aquele cachorro na reunião de 1:1 com o gestor é LITERAL.

Você fica lá, quietinho, fingindo ouvir enquanto internamente tá tipo 'quando isso vai acabar?'

Mas o cachorro é mais honesto — ele pelo menos dorme sem culpa.

E sabe o que é pior? O gestor acha que você tá engajado porque você tá quietinho. Não, cara. Você tá morto por dentro."`;
  }

  // Default baseado no arquétipo
  const archetypeTemplates = {
    'authority-speech': `"A gente precisa parar de normalizando a frustração no ambiente corporativo.

O que eu recomendo é olhar pro seu histórico. Quantos projetos você entregou? Quantas pessoas você desenvolveu? Se isso não for reconhecido, o problema não é você."`,

    'corporate-absurd': `Cara, tem uma coisa que eu não entendo...

RH pedindo 'paixão pela empresa' com salário que não dá nem pra pagar conta de água.

Se você precisa se apaixonar pela empresa pra ser bem pago, algo tá muito errado aí.`,

    'metaphorical-humor': `Aquele cachorro na reunião de 1:1 é LITERAL. Você fica lá, quietinho, fingindo ouvir enquanto internamente tá tipo "quando isso vai acabar?"

Mas o cachorro é mais honesto — ele pelo menos dorme sem culpa.`,

    'tech-edge': `Olha, IA não tá tomando seu lugar não. Você que tá usando ela errado.

A real: quem usar IA bem vai ficar rico. Quem ignorar vai ficar obsoleto.`,
  }

  return archetypeTemplates[reference.archetype] || archetypeTemplates['authority-speech']
}

const HOOK_SUGGESTIONS = {
  'authority-speech': [
    '"A gente precisa parar de..."',
    '"Ninguém fala sobre..."',
    '"Isso que você chama de fit cultural..."',
    '"Se isso não é reconhecido..."',
  ],
  'corporate-absurd': [
    '"Tem uma coisa que eu não entendo..."',
    '"Quando o RH pede..."',
    '"Tipo, sério mesmo?"',
    '"Se você precisa se apaixonar..."',
  ],
  'metaphorical-humor': [
    '"Aquele [animal] em [situação corporativa]..."',
    '"É tipo aquele feeling..."',
    '"Você fica lá, quietinho..."',
  ],
  'tech-edge': [
    '"Olha, IA não tá..."',
    '"Eu testei esse novo..."',
    '"A real: quem usar..."',
    '"Ninguém tá falando sobre..."',
  ],
}

export default function RemixEngine({ reference, onGenerateScript, onClose }) {
  const [transcript, setTranscript] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [suggestedHooks, setSuggestedHooks] = useState([])
  const [selectedHook, setSelectedHook] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleTranscribe = async () => {
    setTranscribing(true)
    // Simular transcrição
    await new Promise(resolve => setTimeout(resolve, 1500))

    const transcript = generateTranscript(reference)
    setTranscript(transcript)

    const hooks = HOOK_SUGGESTIONS[reference.archetype] || HOOK_SUGGESTIONS['tech-edge']
    setSuggestedHooks(hooks)
    setSelectedHook(hooks[0])

    setTranscribing(false)
  }

  const handleGenerateScript = async () => {
    setGeneratingScript(true)

    // Simular geração de roteiro
    await new Promise(resolve => setTimeout(resolve, 2000))

    const script = `ROTEIRO DE REAÇÃO - ${reference.title.toUpperCase()}

[ABERTURA - 0-3s]
Hook: ${selectedHook}
Narração: ${selectedHook.replace(/"/g, '')} Olha só esse conteúdo que encontrei...

[REFERÊNCIA ORIGINAL]
(Embed ou corte do vídeo original de @${reference.author})

[REAÇÃO TÉCNICA - 5-25s]
Narração: A real é que isso que a @${reference.author} falou é exatamente o problema que a gente vê no mercado todo dia.

${transcript}

[CTA FINAL - 25-30s]
Narração: Salva esse vídeo e manda pro seu grupo de trabalho. Eu aposto que alguém vai falar "meu Deus, era exatamente assim mesmo".

📍 Crédito: @${reference.author}
Fonte: ${reference.platform.toUpperCase()}
Link original: [link do conteúdo original]

---
NOTAS DE PRODUÇÃO:
- Abertura impactante com o hook
- Incluir o vídeo original como contexto
- Reação técnica/analítica (style Karen)
- Sem julgamento moral, mas com crítica contrutiva
- CTA que conecta com audiência
`

    onGenerateScript(script)
    setGeneratingScript(false)
  }

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">{reference.title}</h3>
            <p className="text-sm text-gray-600">@{reference.author}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Transcription section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Volume2 size={16} className="text-orange-600" />
            <h4 className="font-semibold text-gray-900">Transcrição</h4>
          </div>

          {!transcript ? (
            <button
              onClick={handleTranscribe}
              disabled={transcribing}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium transition-colors disabled:opacity-50"
            >
              {transcribing ? (
                <>
                  <Loader2 size={16} className="inline animate-spin mr-2" />
                  Transcrevendo áudio...
                </>
              ) : (
                <>
                  <Volume2 size={16} className="inline mr-2" />
                  Transcrever áudio original
                </>
              )}
            </button>
          ) : (
            <div className="bg-white border border-orange-200 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
              <p>{transcript}</p>
              <button
                onClick={copyTranscript}
                className="mt-2 flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium text-xs"
              >
                {copied ? (
                  <>
                    <Check size={14} /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copiar
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Hooks section */}
        {suggestedHooks.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Hooks Sugeridos</h4>
            <div className="space-y-2">
              {suggestedHooks.map((hook, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedHook(hook)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm',
                    selectedHook === hook
                      ? 'border-orange-500 bg-orange-50 text-orange-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                  )}
                >
                  {hook}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DNA note */}
        {transcript && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900">
            <p className="font-semibold mb-1">💭 DNA Translation</p>
            <p>
              Esse hook segue o padrão da Karen: abertura provocadora + crítica ao senso comum + reframing + ação prática. Sem motivação baca, sem floreios.
            </p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {transcript && (
        <div className="border-t p-4 bg-white space-y-2">
          <button
            onClick={handleGenerateScript}
            disabled={generatingScript || !selectedHook}
            className="w-full px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generatingScript ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gerando roteiro...
              </>
            ) : (
              '✨ Gerar Roteiro de Reação'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
