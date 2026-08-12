// Bucket de temas salvos/expandidos por IA, compartilhado entre o Studio
// (Protocolo de Carrossel, modo trabalho) e o Hub de Ideias — mesma chave de
// localStorage que o Studio já usa (`cio-saved-themes`), no mesmo formato de
// item ({id, tema, categoria, temperatura, motivo, fonte, criadoEm}). Como os
// dois leem e escrevem no mesmo bucket, expandir um tema em um lugar aparece
// no outro na próxima vez que a tela abrir — sem sincronização especial.
const KEY = 'cio-saved-themes'

export function loadSavedThemes() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function appendSavedThemes(newItems) {
  const current = loadSavedThemes()
  const updated = [...current, ...newItems]
  try {
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    /* quota exceeded — ignore, os novos itens ainda ficam no state local */
  }
  return updated
}
