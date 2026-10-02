import { KAREN_VOICE_VERSION, KAREN_VOICE_SOURCES } from '../../data/karenVoice'

export default function VoiceRulesNotice() {
  return <section className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700">
    <h3 className="font-semibold text-gray-900">Base editorial de Karen · {KAREN_VOICE_VERSION}</h3>
    <p className="mt-2">Estratégia → Gates → Personagem → Voz → Marcador → Formato. O jogo orienta a leitura; a metáfora só entra quando ajuda.</p>
    <p className="mt-2 text-xs">Esta versão foi incorporada ao contexto compartilhado de voz. O questionário complementa a base. Mudanças futuras no Notion precisam ser incorporadas ao app.</p>
    <div className="mt-2 flex flex-wrap gap-3">{KAREN_VOICE_SOURCES.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-xs underline text-orange-800">{source.title}</a>)}</div>
  </section>
}
