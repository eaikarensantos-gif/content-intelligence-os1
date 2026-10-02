import { useState } from 'react'
import { detectBannedWords } from '../../lib/clicheDetector'

export default function BannedRulesPreview({ rules }) {
  const [sample, setSample] = useState('Uma conversa sobre contratos.')
  const normalized = rules.map(rule => rule.trim().toLocaleLowerCase('pt-BR'))
  const broad = rules.filter(rule => rule.trim().split(/\s+/).length === 1)
  const duplicates = normalized.length - new Set(normalized).size
  const matches = detectBannedWords(sample, rules)
  return <details className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
    <summary>Revisar o alcance das regras: {broad.length} palavra(s) isolada(s), {duplicates} repetição(ões)</summary>
    <p className="mt-2">Palavras isoladas podem bloquear frases comuns. A lista continua valendo; esta prévia ajuda a decidir o que manter. Estruturas são verificadas pelo filtro editorial separado.</p>
    <label className="block mt-2">Texto para testar<textarea value={sample} onChange={event => setSample(event.target.value)} className="mt-1 w-full rounded border p-2 text-gray-800" /></label>
    <p>{matches.length ? `Bloqueios encontrados: ${matches.map(match => match.phrase || match.match || match.label || String(match)).join(', ')}` : 'Nenhuma expressão desta lista encontrada no exemplo.'}</p>
  </details>
}
