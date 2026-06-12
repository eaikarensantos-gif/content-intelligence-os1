// Parse JSON vindo de respostas de IA. Lança erro amigável em vez de
// SyntaxError críptico quando a resposta vem malformada.
export function parseAIJson(str) {
  const sanitized = str.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  try {
    return JSON.parse(sanitized)
  } catch {
    throw new Error('A IA retornou uma resposta em formato inválido. Tente novamente.')
  }
}
