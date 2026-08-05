// Categorias do Banco de Temas.
//
// O banco de trabalho seguia o posicionamento antigo — Carreira, Maturidade
// Profissional, Tomada de Decisão, Dinâmicas Corporativas, IA e Futuro do
// Trabalho. Isso descrevia o território de onde o teste de posicionamento está
// saindo: 14 das 18 peças da grade não tinham categoria onde morar, incluindo
// todas as compatíveis com campanha. As categorias agora são os quatro pilares
// do teste.

export const WORK_CATEGORIES = ['Negócio & estrutura', 'IA crítica', 'Celular & operação', 'Identidade']

export const PERSONAL_CATEGORIES = ['Naomi', 'Casa & Rotina', 'Fé', 'Comprinhas & Achados', 'Hobbies & Gostos', 'Vida']

/** Temas já salvos com as categorias antigas mudam de gaveta, não somem. */
export const WORK_CATEGORY_MIGRATION = {
  'Carreira': 'Negócio & estrutura',
  'Maturidade Profissional': 'Negócio & estrutura',
  'Tomada de Decisão': 'Negócio & estrutura',
  'Dinâmicas Corporativas': 'Negócio & estrutura',
  'IA e Futuro do Trabalho': 'IA crítica',
}

export const migrateWorkCategory = (categoria) =>
  WORK_CATEGORY_MIGRATION[categoria] || categoria

/** Classificação de fallback, usada quando não há chave de API para a IA classificar. */
export function categorizeWorkTheme(tema) {
  const t = (tema || '').toLowerCase()
  // Identidade primeiro: é o recorte mais específico e não pode ser engolido
  // pelos outros quando o tema também fala de negócio ou de ferramenta.
  if (/negra|negro|racia|racismo|representativ|ancestral|diversidade|preconceito|[uú]nica pessoa|povo preto/.test(t)) return 'Identidade'
  // Celular antes de IA: "fluxo de IA no celular" é operação, não crítica de ferramenta.
  if (/celular|smartphone|mobile|telefone|whatsapp|aplicativo|\bapp\b|print|na palma|sem (o )?computador|sem (o )?notebook/.test(t)) return 'Celular & operação'
  if (/\bia\b|intelig[eê]ncia artificial|automa[çc]|chatgpt|algoritmo|ferramenta|software|machine|llm|prompt|assinatura|se paga/.test(t)) return 'IA crítica'
  return 'Negócio & estrutura'
}

export function categorizePersonalTheme(tema) {
  const t = (tema || '').toLowerCase()
  if (/naomi|cachorr|pet|buldogue|bulldog/.test(t)) return 'Naomi'
  if (/casa|decora|cozinha|planta|apartamento|reforma|fax|limpeza|rotina/.test(t)) return 'Casa & Rotina'
  if (/f[ée]\b|deus|ora[çc]|gratid[aã]o|terreiro|orix|vodum|jeje|candombl|b[uú]zio|ax[eé]|ancestral|obriga[çc][aã]o|povo de santo/.test(t)) return 'Fé'
  if (/compr|achado|shopee|amazon|resenha|make|skincare|roupa|look|unboxing/.test(t)) return 'Comprinhas & Achados'
  if (/livro|s[ée]rie|filme|viagem|restaurante|caf[ée]|m[uú]sica|treino|corrida|hobby|receita/.test(t)) return 'Hobbies & Gostos'
  return 'Vida'
}

export const categorizeTheme = (tema, isPessoal) =>
  isPessoal ? categorizePersonalTheme(tema) : categorizeWorkTheme(tema)

/** Nicho declarado para o modelo em toda geração de conteúdo de trabalho. */
export const WORK_NICHE =
  'Nicho: IA aplicada a negócio pequeno, estrutura para quem trabalha como PJ ou autônomo, ' +
  'e o celular como ferramenta de operação. Audiência: dono de negócio pequeno, PJ e autônomo — ' +
  'não é audiência corporativa em busca de promoção.'
