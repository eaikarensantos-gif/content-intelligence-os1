// Pedido de legenda para a IA, com as regras de voz da Karen (.claude/sistema-de-conteudo.md, seções 6 e 7).
// A IA só organiza o que está nos cards: número e leitura da Karen que não vieram dela ficam entre colchetes.
import { pacoteDe, textoDoCard } from './pacotePublicacao'

export const TIPOS_LEGENDA = {
  geral: 'Carrossel comum',
  terca: 'Carrossel de terça (contagem)',
}

const REGRAS_DE_VOZ = `Escreva como a Karen Santos mandando um áudio para uma colega sênior: designer, analítica, técnica, tom sério e direto.
Obrigatório:
- Oralidade real. Pode usar "O ponto é...", "Na prática...", "O que acontece aqui é...".
- Misture uma frase longa de explicação técnica com uma curta de fechamento. Vocabulário de palavras curtas e simples.
- Admita onde o raciocínio tem limite, em uma frase só, quando o conteúdo permitir.
- Termine com uma conclusão prática, um dado ou uma observação seca.
Proibido:
- "Não é X, é Y", "não é sobre X", "menos X, mais Y".
- Travessão para dar impacto. Use pontuação comum.
- Três ou mais frases curtas seguidas, ou quebra de linha estilo poema.
- As palavras: mindset, propósito, transformação, ecossistema (vago), braço (no sentido de apoio), próximo nível, melhor versão, desbloqueie seu potencial, seja protagonista.
- "Você sente", "você precisa", "você deveria".
- Fechar com pergunta de engajamento ("concorda?", "e você?", "vamos juntos?") ou frase de efeito.
- Inventar número. Se um número não está nos cards, escreva [SEU NÚMERO].
Responda só com o texto da legenda, sem título, sem explicação e sem aspas.`

const ESTRUTURA_TERCA = `Estrutura obrigatória (carrossel de terça):
1. Primeira linha: a pergunta de contagem do card 1, do jeito que está.
2. A leitura da Karen. Ela é a tese dela e não vem dos cards: escreva exatamente [SUA LEITURA] e deixe para ela.
3. A frase "A conta leva 5 minutos e está nos slides."
4. A ponte no fim: verbo de ação e destino nomeado, tirada do último card (exemplos: "manda pra pessoa de quem você mais queria um retorno", "comenta o seu número", "salva e volta dia 15/12"). Nunca "reflita" nem "e você?".
Use só números agregados que estejam nos cards. Nenhum nome, empresa ou resposta individual.`

const ESTRUTURA_GERAL = `Estrutura: abra com a ideia central do primeiro card em linguagem de conversa, desenvolva em poucas frases com o que está nos cards e feche com uma ponte de ação com destino nomeado (verbo de ação, nunca "reflita" nem "e você?").`

/** Texto de sistema e mensagem do usuário para a IA. */
export function montarPedidoLegenda(projeto, tipo = 'geral') {
  const cards = projeto.slides
    .map((s, i) => `Card ${i + 1}: ${textoDoCard(s) || '(sem texto)'}`)
    .join('\n')
  const { legenda } = pacoteDe(projeto)
  return {
    system: `${REGRAS_DE_VOZ}\n\n${tipo === 'terca' ? ESTRUTURA_TERCA : ESTRUTURA_GERAL}`,
    pedido: `Cards do carrossel, na ordem:\n${cards}${legenda.trim() ? `\n\nLegenda atual (reescreva se ajudar, mantendo o que a Karen já escreveu):\n${legenda.trim()}` : ''}`,
  }
}

export async function gerarLegenda(projeto, tipo = 'geral') {
  const { system, pedido } = montarPedidoLegenda(projeto, tipo)
  const res = await fetch('/api/ai?action=openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': localStorage.getItem('cio-openai-key') || '' },
    body: JSON.stringify({ model: 'gpt-5.6-terra', thinking: { type: 'adaptive' }, max_tokens: 2000, system, messages: [{ role: 'user', content: pedido }] }),
  })
  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }
  const data = await res.json()
  const texto = data.content?.find((b) => b.type === 'text')?.text?.trim()
  if (!texto) throw new Error('A IA não devolveu a legenda. Tente de novo.')
  return texto
}
