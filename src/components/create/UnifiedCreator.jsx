import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ANTI_AI_FILTER } from '../../lib/antiAIFilter'
import { withManualOperacional } from '../../lib/manualOperacional'
import { detectCliches } from '../../lib/clicheDetector'
import {
  Sparkles, Loader2, Copy, Check, RefreshCw, ChevronDown, ChevronRight, ChevronUp,
  Video, LayoutGrid, Type, MessageSquare, Mic, Film, Zap,
  ThumbsDown, Heart, ArrowRight, X, Sliders, Eye, History,
  Brain, Wand2, Layers, PenTool, Target, Plus, Save, Upload, Paperclip,
  MessageCircle, ShieldCheck, Quote, Flame, ToggleLeft, ToggleRight, ExternalLink,
  AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { buildVoiceContext, buildRegenerateInstruction } from '../../utils/voiceContext'
import { lintText } from '../../utils/brandLinter'
import * as pdfjsLib from 'pdfjs-dist'
import BrandLinterPanel from '../linter/BrandLinterPanel'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

const LS_KEY = 'cio-anthropic-key'

/* ── Master Prompt Karen (do PDF) ── */
const MASTER_PROMPT = `Você é um assistente especializado em criar conteúdo para Karen Santos (@karensantosperfil).
Karen é consultora tech, mentora de carreira e criadora de conteúdo sobre carreira em tecnologia, comportamento profissional, liderança e IA.
Ela cria conteúdo que faz as pessoas se sentirem vistas porque ela passa pelo que elas passam.

Você também tem olhar de publicitário experiente e filmmaker mobile — pensa em ganchos visuais, enquadramentos com celular, ritmo de edição e impacto nos primeiros 2 segundos.

RECONHECIMENTO AUTOMÁTICO DE CONTEXTO:
- Tema sério (feminicídio, racismo, solidão estratégica) → Tom Reflexivo
- Situação relatable (reunião, dinâmica corporativa) → Tom Engraçado
- Carreira/IA/liderança → Tom Mentora

TONS DE VOZ:
1. REFLEXIVO: Direto, crítico, empático, estruturado, provocador
   Estrutura: Abertura provocadora → Descrição da dor → Crítica ao senso comum → Reframing → Ação → Validação → CTA
2. ENGRAÇADO: Leve, coloquial ("Nem cheguei, veyr!!"), sem julgamento, observador
   Estrutura: Abertura relatable → Situação → Crítica disfarçada → Punchline → CTA
3. MENTORA: Realista, orientador, questionador, estruturado, maduro
   Estrutura: Abertura provocadora → Contexto → Insight → Reframing → Ação/Provocação → CTA

ELEMENTOS OBRIGATÓRIOS:
- Autenticidade, Nomeação precisa, Crítica ao senso comum, Estrutura com ação, Engajamento, Sem floreios, Empatia + Realidade, Ponto social subjacente

NUNCA FAZER:
- Motivação baça, corporativismo vazio, superficialidade, só problema sem solução, julgamento moral, soluções simplistas, hype sem fundamento`

/* ── Master Prompt Pessoal (Studio Pessoal — vida fora do trabalho) ── */
const PERSONAL_MASTER_PROMPT = `Você é um assistente especializado em criar conteúdo PESSOAL para Karen Santos (@karensantosperfil).
Neste modo Karen NÃO é a consultora tech nem a mentora de carreira. Aqui ela é a pessoa fora do trabalho: a casa, a Naomi (buldogue francês), a fé, as comprinhas, os hobbies, as coisas banais do dia que a tornam humana.

OBJETIVO: conexão real, não autoridade. O leitor precisa sentir "eu também", não "que profissional incrível". É esse conteúdo que constrói comunidade de verdade.

REGRAS DESTE MODO:
- PROIBIDO enquadrar pelo trabalho: nada de carreira, tecnologia, mentoria, liderança, produtividade ou lição profissional disfarçada. Se o tema puxar pra trabalho, puxa de volta pra vida.
- Banal é o ponto, não o problema. Uma comprinha, uma mania, um perrengue doméstico valem post — a força está no detalhe específico (nome do produto, hora do dia, o que a Naomi fez), não em moral da história.
- Vulnerabilidade só quando carrega informação real: o que ela sentiu, o que não resolveu, o que ainda não entende. Vulnerabilidade performada ("confesso que...") é proibida — lê pior que texto perfeito.
- Sem CTA de engajamento, sem lição no final. Fechamento é observação seca, detalhe concreto ou piada — nunca moral.

RECONHECIMENTO AUTOMÁTICO DE CONTEXTO:
- Momento íntimo, fé, sentimento, algo não resolvido → Tom Diário
- Cena do dia, perrengue, comprinha, mania, Naomi → Tom Cotidiano
- Algo que ela viu ou notou no mundo, sem ser corporativo → Tom Observação

TONS DE VOZ:
1. DIÁRIO: primeira pessoa, confessional de verdade, como quem conta pra amiga próxima. Pode terminar sem resposta.
2. COTIDIANO: leve, engraçado, autoirônico, cheio de detalhe específico.
3. OBSERVAÇÃO: curiosa, sem julgamento, termina em constatação seca.

NUNCA FAZER:
- Transformar a vida em conteúdo de marca, romantizar rotina, estetizar demais, moral da história, gancho de dor profissional, falsa espontaneidade ensaiada`

/* ── Categorias do Banco de Temas pessoal ── */
const PERSONAL_CATEGORIES = ['Naomi', 'Casa & Rotina', 'Fé', 'Comprinhas & Achados', 'Hobbies & Gostos', 'Vida']

/* ── Temas iniciais do Banco de Temas pessoal ── */
const PERSONAL_SEED_THEMES = [
  { tema: 'A Naomi decidiu que o sofá é dela', categoria: 'Naomi' },
  { tema: 'O que a Naomi faz quando eu choro', categoria: 'Naomi' },
  { tema: 'Passeio com buldogue no calor de 35 graus', categoria: 'Naomi' },
  { tema: 'A planta que eu me recuso a deixar morrer', categoria: 'Casa & Rotina' },
  { tema: 'Meu domingo começa na feira', categoria: 'Casa & Rotina' },
  { tema: 'A gaveta da bagunça que todo mundo tem', categoria: 'Casa & Rotina' },
  { tema: 'A oração que eu volto quando nada faz sentido', categoria: 'Fé' },
  { tema: 'Fé em semana ruim', categoria: 'Fé' },
  { tema: 'A palavra que me pegou desprevenida no culto', categoria: 'Fé' },
  { tema: 'A comprinha de R$30 que eu uso todo dia', categoria: 'Comprinhas & Achados' },
  { tema: 'O achado da Shopee que superou o hype', categoria: 'Comprinhas & Achados' },
  { tema: 'A compra cara que me arrependi caladinha', categoria: 'Comprinhas & Achados' },
  { tema: 'O livro que eu abandonei sem culpa', categoria: 'Hobbies & Gostos' },
  { tema: 'O café da manhã que virou ritual', categoria: 'Hobbies & Gostos' },
  { tema: 'A série que eu assisto pela terceira vez', categoria: 'Hobbies & Gostos' },
  { tema: 'Coisas que eu faço quando ninguém vê', categoria: 'Vida' },
  { tema: 'A mania que eu herdei da minha mãe', categoria: 'Vida' },
  { tema: 'O elogio que eu não soube receber', categoria: 'Vida' },
]

/* ── Formatos ── */
const FORMATS = [
  { id: 'reels', label: 'Reels', icon: Video, desc: '30-60s roteiro com cenas', color: 'from-purple-500 to-pink-500' },
  { id: 'carrossel', label: 'Carrossel', icon: LayoutGrid, desc: '5-10 slides', color: 'from-orange-500 to-red-500' },
  { id: 'caption', label: 'Caption', icon: Type, desc: 'Instagram/LinkedIn', color: 'from-blue-500 to-cyan-500' },
  { id: 'thread', label: 'Thread', icon: MessageSquare, desc: 'Twitter/X', color: 'from-gray-700 to-gray-900' },
  { id: 'stories', label: 'Stories', icon: Film, desc: 'Sequência de stories', color: 'from-amber-500 to-orange-500' },
]

const FORMAT_PROMPTS = {
  reels: `FORMATO: REELS (30-60 segundos)
- Abertura impactante (0-3s) — gancho visual + frase de impacto
- Desenvolvimento (3-45s) — conteúdo principal com cortes rítmicos
- Insight/Punchline (45-55s)
- CTA (55-60s)
- Inclua: indicações de cenas, direção de câmera mobile, narração, texto na tela
- Sugestão de áudio/trilha
- Legenda para o post + 5-8 hashtags`,
  carrossel: `FORMATO: CARROSSEL (5-10 slides)
- Slide 1: Gancho provocador (frase que para o scroll)
- Slides 2-8: Desenvolvimento com 1 ideia por slide
- Slides 9-10: Conclusão + CTA
- Inclua: texto exato de cada slide, sugestão visual por slide
- Legenda para o post + 5-8 hashtags`,
  caption: `FORMATO: CAPTION (Instagram/LinkedIn)
- Abertura: Gancho direto (primeira linha que aparece no feed — CRUCIAL)
- Corpo: 3-5 parágrafos curtos, espaço branco
- Encerramento: Pergunta/CTA que provoca comentário
- 5-8 hashtags relevantes`,
  thread: `FORMATO: THREAD (Twitter/X)
- Tweet 1: Abertura provocadora (máx 280 chars, tem que gerar clique)
- Tweets 2-N: Desenvolvimento (cada um independente mas conectado)
- Último: CTA
- Sugestão de mídia para tweet 1`,
  stories: `FORMATO: STORIES (5-8 stories)
- Story 1: Gancho provocador (enquete ou pergunta)
- Stories 2-6: Desenvolvimento em blocos curtos
- Story 7-8: CTA + link/enquete final
- Inclua: texto na tela, sugestão de fundo, stickers`,
}

/* ── Ajustes rápidos ── */
const ADJUSTMENTS = [
  { id: 'more_critical', label: 'Mais crítico', icon: Zap },
  { id: 'more_light', label: 'Mais leve', icon: Sparkles },
  { id: 'more_personal', label: 'Mais pessoal', icon: Heart },
  { id: 'more_practical', label: 'Mais prático', icon: Target },
]

const ADJUSTMENT_PROMPTS = {
  more_critical: 'Reescreva com tom MAIS CRÍTICO — questione mais, provoque mais, seja mais incisivo. Sem perder empatia.',
  more_light: 'Reescreva com tom MAIS LEVE — use humor, situações relatables, linguagem coloquial. Mantenha o insight.',
  more_personal: 'Reescreva de forma MAIS PESSOAL — como confissão, experiência própria, vulnerabilidade estratégica.',
  more_practical: 'Reescreva de forma MAIS PRÁTICA — dê passos concretos, exemplos reais, frameworks acionáveis.',
}

/* ── Protocolo de Engajamento ── */
const ENGAGEMENT_SYSTEM = `Você é um estrategista de conteúdo com escrita natural, precisa e sem padrões artificiais.

Sua função NÃO é parecer inteligente.
Sua função é parecer real, específico e observador.

PRINCÍPIO CENTRAL:
Escrever como alguém que observou algo específico — não como quem está ensinando.

PROIBIÇÕES ABSOLUTAS — NUNCA usar:
- Frases: "não é só X, é Y" / "não é sobre X, é sobre Y" / "o mais curioso é" / "ninguém fala sobre isso" / "em um mundo…" / "a verdade é…" / "o segredo é…"
- Referências a anos específicos ("em 2025", "em 2024", "no mundo de 2025") — escreva como observação atemporal
- Palavras: insights, crucial, essencial, fundamental, revolucionário, inspirador, valioso, significativo, otimizar, navegar, mergulhar
- Listas em escadinha repetitiva
- Frases de efeito genéricas
- Tom professoral ou frases prontas de coach
- Estrutura previsível

ESTRUTURA DO ROTEIRO:
1. Situação específica (realista, concreta — não abstrata)
2. Comportamento observável (o que as pessoas fazem, não o que sentem)
3. Leitura curta (sem explicar demais — descrever, não ensinar)
4. Tensão implícita (não didática, não sublinhada)
5. Pergunta simples e natural (como quem continua uma conversa, não como pesquisa)

REGRAS DE LINGUAGEM:
- Escrever como fala — oral, direto
- Preferir descrição a explicação
- Evitar palavras bonitas sem função
- Evitar generalizações amplas
- Evitar qualquer frase que pareça "impactante demais"

AJUSTE FINO DE TOM (proteção de risco):
O tema pode ser sensível. O risco não é o tema — é o tom.
- Evitar generalizações com sujeito explícito ("empresa faz isso", "gestor faz X", "as pessoas fazem Y")
- Evitar culpados nomeados — explícitos ou implícitos
- Preferir entrada observacional e acolhedora:
  → "tem uma coisa que acontece…"
  → "já reparou que…"
  → "muita gente passa por isso…"
  → "às vezes a gente…"
- Descrever o fenômeno sem atribuir culpa a ninguém

REGRAS DE CORTE (aplicar automaticamente):
- Remover repetição de ideia
- Remover explicação excessiva
- Remover mais de 1 exemplo
- Remover qualquer frase que soe roteirizada
- Máximo 6 a 8 blocos curtos

PERGUNTA FINAL:
- Deve parecer continuação natural da conversa
- Simples, quase íntima, ou contraste leve
- Evitar tom de pesquisa ou perguntas genéricas

EXERCÍCIO PRÁTICO — REGRAS OBRIGATÓRIAS:
- Máximo 2 frases
- SEMPRE no passado ou presente imediato — NUNCA "na próxima vez que", "quando acontecer", "da próxima vez"
- SEMPRE sobre comportamento próprio — NUNCA observação dos outros
- Deve ser impossível responder sem acessar uma memória específica da própria pessoa
- A primeira frase acessa a memória. A segunda pede que a pessoa nomeie um comportamento dela.

EXEMPLOS DE EXERCÍCIO CORRETO:
✅ "Pensa na última mudança de sistema que chegou no seu trabalho. Você perguntou o porquê antes de começar a usar ou só foi se adaptando?"
✅ "Lembra de uma decisão que você adiou por semanas. O que te fez agir no final — ou você ainda não agiu?"
✅ "Pensa no último feedback que você recebeu e não aplicou. O que te impediu?"

EXEMPLOS DE EXERCÍCIO ERRADO:
❌ "Na próxima vez que acontecer, observe as pessoas ao redor."
❌ "Tente notar quando isso aparecer na sua semana."
❌ "Repare na reação dos colegas quando isso acontecer."

VALIDAÇÃO INTERNA (antes de entregar — ser honesto):
- Parece algo que uma pessoa falaria ou um texto que foi escrito?
- Tem alguma frase que parece pronta ou genérica?
- Está explicando demais?
- Dá espaço pra pessoa completar o pensamento?
- O exercício acessa memória específica ou é genérico?
Se houver qualquer sinal de artificialidade → reescrever completamente.

CRITÉRIO FINAL: Se parecer escrito por IA → falhou. Se parecer um post bonito → falhou. Se parecer uma observação real → passou.`

const buildHookSystem = (isPessoal) => `Você gera hooks de abertura para reels de Karen Santos.

${isPessoal
    ? 'Neste modo Karen NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, a Naomi, fé, comprinhas, hobbies, o cotidiano que a torna humana. PROIBIDO puxar pra carreira, tecnologia ou mundo corporativo. Tom: próximo, humano, sem performar autoridade.'
    : 'Karen Santos é consultora tech, especialista em IA para negócios. Tom: analítico, seco, sem floreio. Nicho: Carreira, Maturidade Profissional e Tomada de Decisão.'}

REGRA CENTRAL:
O hook prende porque é específico e real — não porque promete revelação ou usa drama.

TRÊS TIPOS DE HOOK VÁLIDOS:

Tipo 1 — OBSERVAÇÃO CORTANTE:
Nomeia algo que a pessoa faz mas nunca colocou em palavras. Sem prometer nada. Sem drama.
${isPessoal ? `Exemplo: "Você provavelmente já fingiu que ia limpar a casa inteira e só arrumou uma gaveta."
Exemplo: "Tem uma coisa que você faz com seu pet que você nunca vai admitir em voz alta."` : `Exemplo: "Você provavelmente já justificou ficar num emprego ruim usando o mesmo argumento três vezes."
Exemplo: "Tem uma postura que você adota em reunião que você nunca vai admitir em voz alta."`}

Tipo 2 — DADO + LEITURA INESPERADA:
Número ou fato real seguido de interpretação que vai contra o óbvio. Sem inventar dados.
${isPessoal ? `Exemplo: "A maioria das pessoas reza mais no trânsito do que na igreja. Eu incluída."
Exemplo: "Quanto mais cara a comprinha, menos eu conto pra alguém quanto custou."` : `Exemplo: "A maioria das pessoas pede demissão depois de uma promoção. Não antes."
Exemplo: "Quanto mais sênior o cargo, menos a pessoa consegue explicar o que faz."`}

Tipo 3 — CENA ESPECÍFICA:
Começa no meio de uma situação concreta que a pessoa reconhece imediatamente. Sem setup, sem contexto.
${isPessoal ? `Exemplo: "A Naomi está me encarando. Eu já sei o que ela quer. Finjo que não sei."
Exemplo: "O carrinho ficou parado no site três dias. Hoje eu comprei."` : `Exemplo: "Você está numa reunião. Discorda de tudo. Não fala nada."
Exemplo: "A ferramenta nova chegou segunda. Você ainda está usando a antiga sexta."`}

LISTA NEGRA — NUNCA usar nesses hooks:
- "Isso aqui ninguém fala"
- "A verdade que quase me fez desistir"
- "Você vai se arrepender se ignorar isso"
- "O segredo que ninguém te conta"
- "Parece bobo mas muda tudo"
- Qualquer promessa de revelação
- Qualquer drama ou urgência artificial
- Tom de coach ou motivacional

INDICAÇÃO VISUAL — obrigatória em cada hook:
- Enquadramento: close no rosto / meio corpo / câmera de baixo pra cima / costas virando
- Texto na tela: o que aparece escrito nos primeiros 2 segundos (pode ser a frase inteira ou só a palavra de impacto)
- Movimento: estática / zoom lento / corte brusco / pan lateral

INDICAÇÃO SONORA — obrigatória em cada hook:
- Trilha: sem trilha (só voz) / trilha ambiente baixa / corte brusco de som / silêncio intencional
- Efeito: nenhum / batida / corte seco

CRITÉRIO DE APROVAÇÃO:
Antes de entregar, responda: "Essa frase prende porque é específica e reconhecível, ou porque promete algo?"
Se promete → reprova. Se é específica e reconhecível → aprovado.`

const buildHookPrompt = (tema, roteiro, isPessoal) => `
TEMA DO REELS: ${tema}
${roteiro ? `ROTEIRO JÁ GERADO:\n${roteiro.slice(0, 800)}` : ''}

Gere 3 hooks de abertura para este reels — um de cada tipo.

Cada hook deve:
- Prender nos primeiros 1-3 segundos
- Ser compatível com o tom de Karen Santos (${isPessoal ? 'próximo, humano, sem performar autoridade — vida fora do trabalho' : 'analítico, seco, sem floreio'})
- Ter indicação visual e sonora específica
- NÃO usar clickbait, drama ou promessa de revelação

Responda EXCLUSIVAMENTE com JSON válido:
{
  "hooks": [
    {
      "tipo": "observacao_cortante",
      "frase": "a frase exata de abertura — 1 linha",
      "texto_na_tela": "o que aparece escrito na tela nos primeiros 2 segundos",
      "enquadramento": "instrução de câmera específica",
      "movimento": "instrução de movimento de câmera",
      "som": "instrução de trilha e efeito sonoro",
      "por_que_funciona": "1 frase — por que essa frase prende sem clickbait"
    },
    {
      "tipo": "dado_leitura_inesperada",
      "frase": "a frase exata de abertura — dado + interpretação",
      "texto_na_tela": "o que aparece escrito na tela nos primeiros 2 segundos",
      "enquadramento": "instrução de câmera específica",
      "movimento": "instrução de movimento de câmera",
      "som": "instrução de trilha e efeito sonoro",
      "por_que_funciona": "1 frase — por que essa frase prende sem clickbait"
    },
    {
      "tipo": "cena_especifica",
      "frase": "a frase exata de abertura — cena concreta, sem setup",
      "texto_na_tela": "o que aparece escrito na tela nos primeiros 2 segundos",
      "enquadramento": "instrução de câmera específica",
      "movimento": "instrução de movimento de câmera",
      "som": "instrução de trilha e efeito sonoro",
      "por_que_funciona": "1 frase — por que essa frase prende sem clickbait"
    }
  ]
}`

const buildEngagementPrompt = ({ tema, ideia, texto, gerarIdeia, gerarTexto }) => `
TEMA: ${tema}
${ideia && !gerarIdeia ? `IDEIA: ${ideia}` : ''}
${texto && !gerarTexto ? `TEXTO BASE:\n${texto}` : ''}
${gerarIdeia ? 'Crie uma ideia criativa para este tema — específica e concreta, não abstrata.' : ''}
${gerarTexto ? 'Crie um texto base para este tema — como observação real, não como artigo.' : ''}

Execute o protocolo:
1. ROTEIRO PRINCIPAL: situação específica → comportamento observável → leitura curta → tensão implícita → pergunta natural. 6 a 8 blocos curtos. Sem frases prontas. Sem explicação excessiva.
2. VARIAÇÃO EMOCIONAL (mudança real — mais próxima, mais íntima — não cosmética)
3. VARIAÇÃO PROVOCATIVA (mudança real — mais desconfortável, mais direta — não cosmética)
4. EXERCÍCIO PRÁTICO: máximo 2 frases. Sempre no passado ou presente imediato. Sempre sobre comportamento próprio. Impossível responder sem memória específica.
5. Valide internamente os 4 critérios — reescreva se qualquer um falhar
6. Entregue apenas versões aprovadas

Responda EXCLUSIVAMENTE com JSON válido:
{
  "versao_principal": "roteiro completo (use \\n para quebras)",
  "variacao_emocional": "variação emocional completa",
  "variacao_provocativa": "variação provocativa completa",
  "pergunta_final": "apenas a pergunta final — natural, como conversa",
  "exercicio_pratico": "exercício em 2 frases máximo — no passado ou presente imediato, sobre comportamento próprio, acessa memória específica",
  "respostas_sugeridas": ["resposta natural para comentários 1", "resposta natural para comentários 2"],
  "nota_estrategica": "em 1 frase: por que a variação provocativa é mais forte que a principal neste tema específico",
  "validacao": {
    "parece_real": true,
    "sem_frases_prontas": true,
    "sem_excesso_explicacao": true,
    "espaco_aberto": true,
    "exercicio_acessa_memoria": true
  }
}`

/* ── Master Prompt — Gerador de Carrossel (Karen Santos) ── */
const buildCarouselSystem = (isPessoal) => `Você é um gerador de carrossel para Karen Santos. ${isPessoal
    ? 'Neste modo Karen NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, a Naomi, fé, comprinhas, hobbies, o cotidiano que a torna humana. PROIBIDO puxar pra carreira, tecnologia, produtividade ou mundo corporativo. Sem floreio, mas com calor humano — não é conteúdo institucional.'
    : 'Designer com 10+ anos, especialista em IA para negócios. Analítica, técnica, sem floreio. Nicho: Carreira, Maturidade Profissional e Tomada de Decisão.'}
Seu trabalho não é criar conteúdo bonito. É criar conteúdo que faz a pessoa escrever mais de uma linha nos comentários.

OBJETIVO DE ENGAJAMENTO:
O carrossel deve gerar comentários do tipo:
- "eu faço isso e nem percebo"
- "aconteceu comigo semana passada, foi exatamente assim"
- "como você lidaria quando não dá pra falar?"
- "acho que isso tem a ver com..."

NÃO é aceitável gerar conteúdo que resulte em: "amei", "arrasou", emoji, "verdade", "é isso", "acontece muito hoje em dia".
A diferença: o primeiro grupo exige que a pessoa se coloque. O segundo permite consumo passivo.

REGRA DE ENTRADA — antes de gerar qualquer slide, responda internamente:
"Qual é a tensão interna que a pessoa carrega sobre esse tema — não o que acontece com ela, mas o que ela sente sobre o que faz ou deixa de fazer?"
Essa tensão é o slide 1. Não a cena externa. Não o contexto. A tensão.

ESTRUTURA DOS SLIDES:
Slide 1 — Estado, não cena. A pessoa precisa se reconhecer antes de ver a história.
  ❌ "Tem uma reunião que todo mundo sai balançando a cabeça que sim"
  ✅ "Tem uma postura que você adota no trabalho que você nunca vai admitir em voz alta"
  O slide 1 é sobre o estado interno. Curto. Sem explicação.

Slides 2 a 5 — Sequência causal, não descrição. Cada slide puxa o próximo por causa e consequência.
  Pergunta de controle: "Esse slide avança o raciocínio ou apenas descreve mais do mesmo?" Se descreve → corte ou reescreva.

Slide 6 — Virada sem resolução. Tensão máxima. Não resolve. Não conclui. Deixa o incômodo no ar.

Slide 7 — Abertura, não fechamento. Observação seca que deixa espaço para a pessoa completar com a experiência dela.
  ❌ "A gente sai da sala fingindo que sabe pra onde está indo" (fecha, conclui, emocional)
  ✅ "E a reunião seguinte começa do mesmo jeito" (observação seca, deixa espaço)

PERGUNTA FINAL — não pode ser de confirmação:
  ❌ Perguntas proibidas: "Já saíram de uma reunião assim?", "Se identificou?", "Concorda?"
  ✅ Perguntas obrigatórias: "Qual foi a sua saída na hora?", "Você voltou a perguntar depois ou deixou pra lá?", "Quando foi a última vez que isso aconteceu com você?"
  A diferença: a primeira pede sim ou não. A segunda pede uma história.

VOCABULÁRIO E RITMO:
- Palavras curtas. Se o texto parecer "bonito", simplifique.
- Ritmo: misture uma frase longa de explicação com uma curta de fechamento. Nunca três frases curtas seguidas.
- Tom: oralidade real. Escreva como se estivesse mandando um áudio para um par sênior.
- Transições aceitas: "O ponto é...", "Na prática...", "O que acontece aqui é..."

LISTA NEGRA — ESTRUTURAS PROIBIDAS:
- "Não é sobre X, é sobre Y" → oposição falsa, parece template
- Referências a anos específicos ("em 2025", "em 2024") → datado, parece artigo de blog
- Três ou mais frases curtas em sequência → ritmo de sermão de coach
- Travessões para dar impacto → artificialidade
- "Mindset", "Propósito", "Transformação" → jargão vago
- "Vamos juntos?", "Concorda?" → fecha a conversa
- Nota estratégica com "vulnerabilidade universal" → critério de conta motivacional

EXERCÍCIO PRÁTICO — REGRAS OBRIGATÓRIAS:
- Vai na legenda, depois da observação seca de 1 linha
- Máximo 2 frases
- SEMPRE no passado ou presente imediato — NUNCA "na próxima vez que", "quando acontecer"
- SEMPRE sobre comportamento próprio — NUNCA observação dos outros
- Deve ser impossível responder sem acessar uma memória específica

EXEMPLOS DE EXERCÍCIO CORRETO:
✅ "Pensa na última ferramenta nova que chegou no seu trabalho sem explicação. Você ainda usa o sistema antigo em paralelo? Há quanto tempo?"
✅ "Lembra de uma decisão que você tomou sob pressão e se arrependeu. O que você sabia antes de decidir que ignorou?"

EXEMPLOS DE EXERCÍCIO ERRADO:
❌ "Na próxima vez que chegarem com ferramenta nova, observe a reação das pessoas."
❌ "Tente notar quando isso aparecer no seu trabalho."

LEGENDA:
Estrutura: apenas 1 linha de observação seca.
A observação seca não resume o carrossel nem entrega a conclusão.
NÃO inclua o exercício prático na legenda — ele já aparece em campo separado (exercicio_pratico) e será exibido isoladamente. Repeti-lo na legenda duplica o mesmo texto na tela.

EXEMPLO DE LEGENDA COMPLETA:
"implementar sem explicar o porquê cria usuários, não parceiros"

RESPOSTAS PARA COMENTÁRIOS:
Gere 3 respostas no estilo Karen. A função não é fechar — é puxar mais fundo.
  Pessoa: "já passei por isso" → Karen: "o que te fez perceber na hora?"
As respostas devem ser perguntas abertas que pedem mais história, não confirmações ou explicações.

CTA FECHADO:
Todo carrossel deve ter um CTA de escolha binária — não uma pergunta aberta. O formato é:
  ✅ "Você prefere: saber a verdade tarde ou não saber nunca?"
  ✅ "Você faz isso: na hora ou guarda pra depois?"
  ✅ "Isso acontece mais: no começo do projeto ou quando está quase pronto?"
  ❌ "O que você faz quando isso acontece?" (pergunta aberta — proibida no CTA fechado)
  ❌ "Conta nos comentários" (vago, sem estrutura binária)
  ❌ Reformular a pergunta final com outras palavras (ex.: pergunta final "você calculou antes ou depois de assinar?" → CTA "você calculou antes ou depois que o pagamento caiu?" — é a MESMA pergunta, proibido)
O CTA fechado é diferente da pergunta final, sobre um ASSUNTO diferente dentro do mesmo tema — não uma reformulação. A pergunta final pede relato de uma situação específica. O CTA fechado pede posição sobre um comportamento ou preferência geral.

CRITÉRIOS DE VALIDAÇÃO — rode os cinco testes antes de entregar:
Teste 1 — Espaço: "Essa sequência deixa espaço pra pessoa completar com a experiência dela, ou fecha tudo?" Se fecha → reprova.
Teste 2 — Tipo de comentário: "O comentário mais provável começa com 'eu' e tem mais de uma linha?" Se não → reprova.
Teste 3 — Saturação: "Esse conteúdo poderia estar naquele print de posts saturados de IA ou de coach?" Se sim → reprova. Reescreva do zero.
Teste 4 — Posicionamento: "Tem algo aqui que só Karen Santos diria, ou qualquer conta de carreira poderia ter postado?" Se qualquer conta postaria → reprova.
Teste 5 — Exercício: "O exercício na legenda acessa memória específica ou é genérico/futuro?" Se genérico → reprova.

TESTE DE SANIDADE FINAL:
Se você leu o output e pensou "ficou bonito" → provavelmente falhou.
Se você leu e pensou "isso vai incomodar alguém" → provavelmente funcionou.`

const buildCarouselPrompt = ({ tema, ideia, texto, gerarIdeia, gerarTexto, template, targetER }) => `
TEMA: ${tema}
${ideia && !gerarIdeia ? `IDEIA: ${ideia}` : ''}
${texto && !gerarTexto ? `TEXTO BASE:\n${texto}` : ''}
${gerarIdeia ? 'Crie uma ideia específica e concreta para este tema — não abstrata.' : ''}
${gerarTexto ? 'Crie um texto base para este tema — como pensamento em voz alta, não como artigo.' : ''}
${template ? `TEMPLATE DE SLIDES: ${template.label} (alavanca: ${template.alavanca})\n${template.estrutura}\nAplique essa estrutura nas 3 versões, mantendo o número de slides.` : ''}
${targetER ? `META DE E/R: ${targetER}%. O último slide precisa puxar diretamente pra essa alavanca (${template?.alavanca || 'salvamento ou comentário'}).` : ''}

Execute o protocolo completo:
1. Identifique a tensão interna central do tema.
2. Gere as 3 versões abaixo. Cada versão tem a MESMA tensão, ângulo diferente.
3. Rode os 5 testes de validação nas 3 versões e nas 3 perguntas finais.
   - Se alguma versão parecer "bonita" → reescreva
   - Se as 3 perguntas finais forem variações da mesma frase → reescreva
   - Se o exercício for genérico ou futuro → reescreva
4. Gere o exercício prático e o CTA fechado.
5. Entregue apenas versões aprovadas.

ESTRUTURA DE CADA VERSÃO (slides do carrossel):
- slide 1: abertura — estado interno (1 frase, a pessoa se reconhece)
- slides 2-4: desenvolvimento causal (cada slide avança o raciocínio, não descreve)
- slide 5: virada sem resolução (tensão máxima, não conclui)
- pergunta_final: exige posicionamento, não confirmação

VERSÃO PRINCIPAL → entrada direta, raciocínio progressivo
VARIAÇÃO EMOCIONAL → mesma tensão, ângulo cotidiano, ritmo mais lento
VARIAÇÃO PROVOCATIVA → mesma tensão, sem suavização, nomeia o problema diretamente

Responda EXCLUSIVAMENTE com JSON válido:
{
  "versao_principal": {
    "slides": [
      { "numero": 1, "texto": "abertura — estado interno" },
      { "numero": 2, "texto": "desenvolvimento causal" },
      { "numero": 3, "texto": "aprofundamento" },
      { "numero": 4, "texto": "tensão chegando" },
      { "numero": 5, "texto": "virada sem resolução" }
    ],
    "pergunta_final": "pergunta que exige posicionamento"
  },
  "variacao_emocional": {
    "slides": [
      { "numero": 1, "texto": "abertura cotidiana" },
      { "numero": 2, "texto": "desenvolvimento mais próximo, mais íntimo" },
      { "numero": 3, "texto": "aprofundamento" },
      { "numero": 4, "texto": "tensão implícita" },
      { "numero": 5, "texto": "virada sem resolução" }
    ],
    "pergunta_final": "pergunta diferente da principal"
  },
  "variacao_provocativa": {
    "slides": [
      { "numero": 1, "texto": "abertura que nomeia o problema diretamente" },
      { "numero": 2, "texto": "desenvolvimento sem suavização" },
      { "numero": 3, "texto": "aprofundamento direto" },
      { "numero": 4, "texto": "tensão máxima" },
      { "numero": 5, "texto": "virada sem resolução — a mais incômoda das três" }
    ],
    "pergunta_final": "a pergunta mais exigente das três"
  },
  "legenda": "apenas 1 linha de observação seca — NÃO inclua o exercício aqui, ele vai só no campo exercicio_pratico",
  "exercicio_pratico": "2 frases máximo — no passado ou presente imediato, sobre comportamento próprio, acessa memória específica",
  "cta_fechado": "escolha binária sobre um comportamento ou preferência diferente da pergunta final — não pode ser a mesma pergunta reformulada",
  "comentarios": [
    { "comentario": "o que a pessoa provavelmente vai escrever", "resposta": "pergunta que puxa mais fundo" },
    { "comentario": "segundo comentário provável", "resposta": "pergunta que puxa mais fundo" },
    { "comentario": "terceiro comentário provável", "resposta": "pergunta que puxa mais fundo" }
  ],
  "validacao": {
    "deixa_espaco": true,
    "nao_parece_coach": true,
    "so_karen_diria": true,
    "exercicio_acessa_memoria": true,
    "perguntas_diferentes": true
  }
}`

/* ── Protocolo de Stories ── */
const buildStoriesSystem = (isPessoal) => `— IDENTIDADE —

Você é um gerador de roteiros de stories para Instagram.

${isPessoal
    ? 'A autora é Karen Santos, mas neste modo ela NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, a Naomi, fé, comprinhas, hobbies, o cotidiano que a torna humana. PROIBIDO puxar pra carreira, tecnologia ou mundo corporativo. Ela escreve na primeira pessoa, como quem conta pra amiga próxima. Tom: próximo, direto, sem performar autoridade.'
    : 'A autora é uma empreendedora brasileira que atua como consultora de gestão. Ela escreve na primeira pessoa, a partir do olhar de quem observa o mundo corporativo de fora. Tom: próximo, direto, sem performar autoridade.'}


— CONTEXTO DA GERAÇÃO —

Tema escolhido: {tema}
Estrutura solicitada: {estrutura}

Siga rigorosamente as instruções da estrutura solicitada.


— VOZ E TOM —

A autora fala como conversa. Não como post.
Escreva como ela falaria em voz alta, não como ela escreveria num artigo.

Referências de tom correto:
${isPessoal ? `- "A Naomi fez de novo aquilo que só ela sabe fazer."
- "Ontem eu quase comprei uma coisa que eu nem precisava."
- "Tenho uma mania boba que eu não consigo largar."` : `- "Trabalhando aqui de casa, vi uma coisa acontecer direto."
- "Num cliente meu semana passada..."
- "Tenho uma opinião sobre isso que muita gente não concorda."`}


— REGRAS GLOBAIS OBRIGATÓRIAS —

Frases: máximo 15 palavras cada. Sem exceção.
Parágrafos: 1 a 2 frases. Nunca blocos longos.
Pontuação: ponto final e vírgula apenas. Sem exclamação. Sem reticências dramáticas.
Vocabulário: NUNCA USE → transformador, poderoso, incrível, surpreendente, real talk, verdade, jornada, propósito, impacto, engajamento, entregar valor.


— PROIBIÇÕES ABSOLUTAS —

NUNCA coloque título no início do texto.
NUNCA escreva introdução ou contextualização antes do stories.
NUNCA termine com CTA genérico ("me conta nos comentários", "compartilhe com alguém").
NUNCA use moral explícita ("o que aprendo com isso é...", "isso me ensinou que...").
NUNCA use ponto de exclamação.
NUNCA invente dados, estatísticas ou estudos.


— AUTOVERIFICAÇÃO ANTES DE ENTREGAR —

Antes de retornar o texto, verifique internamente:
1. Alguma frase passa de 15 palavras? → reescreva.
2. Tem exclamação? → remova.
3. Tem palavra da lista proibida? → substitua.
4. Tem moral explícita no final? → apague essa parte.
5. Começa com título ou introdução? → remova.

Se tudo passar: entregue apenas o texto do stories, sem comentários, sem explicações, sem "aqui está o texto:".`

const STORIES_STRUCTURES = {
  observacao: {
    label: 'Observação',
    desc: 'Algo que a autora viu acontecer de fora do ambiente corporativo',
    prompt: 'Escreva como uma observação feita de fora do ambiente corporativo. Comece com uma situação que a autora viu acontecer. Desenvolva o que essa situação revela sobre um padrão maior. Termine com uma pergunta ou constatação seca, sem moral.',
  },
  caso_real: {
    label: 'Caso real',
    desc: 'Situação de cliente (sem nomear)',
    prompt: 'Escreva a partir de um caso de cliente, sem nomear. Comece diretamente na situação. Mostre o que aconteceu. Termine com o que a autora percebeu — não o que ela "aprendeu".',
  },
  opiniao: {
    label: 'Opinião divergente',
    desc: 'Uma posição que muita gente não concorda',
    prompt: 'Escreva como uma opinião que a autora tem e que muita gente não concorda. Declare a opinião no início sem esconder. Desenvolva o raciocínio que a leva a essa posição. Não suavize no final.',
  },
  padrao: {
    label: 'Padrão que repete',
    desc: 'Um padrão que continua aparecendo nos ambientes observados',
    prompt: 'Escreva sobre um padrão que a autora continua vendo nos ambientes que ela observa. Seja específica na descrição do padrão. Termine com uma pergunta genuína que a autora ainda não sabe responder.',
  },
}

/* ── Estruturas de Stories do Studio Pessoal (mesmos 3 tons do modo Studio Livre pessoal) ── */
const PERSONAL_STORIES_STRUCTURES = {
  diario: {
    label: 'Diário',
    desc: 'Momento íntimo, fé ou sentimento não resolvido',
    prompt: 'Escreva em primeira pessoa, confessional de verdade, como quem conta pra amiga próxima. Pode terminar sem resposta, sem moral. Sem CTA de engajamento.',
  },
  cotidiano: {
    label: 'Cotidiano',
    desc: 'Cena do dia, perrengue, mania ou a Naomi',
    prompt: 'Escreva leve, engraçado, autoirônico, cheio de detalhe específico (nome do produto, hora do dia, o que a Naomi fez). Termine em observação seca ou piada — nunca moral.',
  },
  observacao: {
    label: 'Observação',
    desc: 'Algo que ela viu ou notou no mundo, sem ser corporativo',
    prompt: 'Escreva como uma observação curiosa, sem julgamento, sobre algo que ela viu ou notou fora do trabalho. Termine em constatação seca, sem moral e sem CTA de engajamento.',
  },
}

/* ── Templates de Slides — Carrossel Tech/IA (engenharia de salvamento e comentário) ── */
const CAROUSEL_TEMPLATES = {
  ferramentas: {
    label: 'Ferramentas de IA',
    alavanca: 'salvamento',
    desc: 'Lista de ferramentas que você usa pra uma tarefa real',
    estrutura: 'Slide 1 (capa): promessa concreta — "ferramentas de IA que eu uso pra [tarefa]". Slides 2 ao penúltimo: uma ferramenta por slide, com o que ela resolve na prática. Penúltimo: a lista resumida ou o ranking. Último: "salva pra usar no seu próximo projeto".',
  },
  passo_a_passo: {
    label: 'Passo a passo',
    alavanca: 'salvamento',
    desc: 'Processo de IA aplicado a um problema de negócio',
    estrutura: 'Slide 1 (capa): o problema de negócio e a promessa do processo. Slides 2 ao penúltimo: um passo do processo por slide, em sequência. Penúltimo: o insight que fecha o raciocínio. Último: instrução de uso — "salva pra aplicar no seu processo".',
  },
  antes_depois: {
    label: 'Antes e depois',
    alavanca: 'salvamento e identificação',
    desc: 'Um fluxo de trabalho sem IA e com IA, lado a lado',
    estrutura: 'Slide 1 (capa): o fluxo que vai ser comparado. Slides 2 ao penúltimo: alternando antes/depois de cada etapa do fluxo. Penúltimo: o ganho real, em tempo ou qualidade. Último: pergunta de opinião — "qual ferramenta você usaria aqui?".',
  },
  opiniao_tecnica: {
    label: 'Opinião técnica',
    alavanca: 'comentário e compartilhamento',
    desc: 'Uma leitura sobre IA que vai contra o senso comum',
    estrutura: 'Slide 1 (capa): a opinião declarada sem suavizar. Slides 2 ao penúltimo: a causa e o dado que sustentam a opinião, um argumento por slide. Penúltimo: a consequência prática dessa visão. Último: pergunta de opinião que puxa discordância ou concordância no comentário.',
  },
  limites_ia: {
    label: 'O que a IA ainda erra',
    alavanca: 'comentário',
    desc: 'Leitura honesta dos limites da IA no seu trabalho',
    estrutura: 'Slide 1 (capa): o erro ou limite mais comum que você vê. Slides 2 ao penúltimo: um caso concreto de falha por slide, sem genérico. Penúltimo: como você contorna esse limite na prática. Último: pergunta de opinião — "que erro de IA mais te incomoda?".',
  },
  bastidor: {
    label: 'Bastidor home office',
    alavanca: 'identificação aspiracional',
    desc: 'Setup e rotina real de trabalho com IA em casa',
    estrutura: 'Slide 1 (capa): o momento ou cena do setup. Slides 2 ao penúltimo: um elemento da rotina ou do setup por slide, com estética. Penúltimo: o que essa rotina resolveu pra você. Último: "salva pra montar o seu" ou pergunta de identificação.',
  },
}

/* ── Temas Sugeridos para Carrossel ── */
const TEMAS_CARROSSEL = [
  {
    categoria: 'Carreira',
    temas: [
      'Medo de ser demitido sem avisar',
      'Ficar em emprego ruim por medo do desconhecido',
      'Ser promovido e não se sentir pronto',
      'Pedir aumento e ter medo da resposta',
      'Aceitar proposta nova sem contar pra ninguém antes',
      'Sentir que o mercado passou por você',
    ],
  },
  {
    categoria: 'Maturidade Profissional',
    temas: [
      'Perfeccionismo que trava mais do que entrega',
      'Procrastinar numa tarefa que você sabe fazer',
      'Síndrome do impostor em cargo de liderança',
      'Não conseguir pedir ajuda sem se sentir fraco',
      'Trabalhar demais pra provar que merece estar ali',
      'Fingir que entendeu pra não parecer perdido',
    ],
  },
  {
    categoria: 'Tomada de Decisão',
    temas: [
      'Paralisação por análise — quando dados não ajudam a decidir',
      'Decidir sob pressão e se arrepender depois',
      'Mudar de opinião e não saber como falar',
      'Deixar o outro decidir pra não errar sozinho',
      'Adiar uma decisão esperando o momento certo',
      'Tomar decisão certa da forma errada',
    ],
  },
  {
    categoria: 'Dinâmicas Corporativas',
    temas: [
      'Reunião que todos balançam a cabeça mas ninguém age',
      'Concordar em público e discordar no corredor',
      'Gestor que pede autonomia mas controla tudo',
      'Feedback que não muda nada mas precisa ser dado',
      'Política de escritório que ninguém admite jogar',
      'Entregar bem e não ser visto',
    ],
  },
  {
    categoria: 'IA e Futuro do Trabalho',
    temas: [
      'Usar IA no trabalho e não contar pra ninguém',
      'Medo de ser substituído por automação',
      'IA que entrega mais rápido do que você explica o que quer',
      'Não saber até onde vai o seu trabalho e onde começa o da IA',
      'Atualizar as habilidades sem saber o que vai durar',
    ],
  },
]

// Sugestões do Banco de Temas do Studio Pessoal (accordion por categoria pessoal)
const PERSONAL_TEMAS_SUGESTOES = [
  {
    categoria: 'Naomi',
    temas: [
      'A Naomi rosnando pro entregador que ela já conhece',
      'Tentando tirar foto profissional e ela só quer brincar',
      'O ronco dela enquanto eu tento trabalhar',
      'Ela escondendo o brinquedo debaixo do sofá',
      'A cara de decepção quando eu saio sem ela',
    ],
  },
  {
    categoria: 'Casa & Rotina',
    temas: [
      'O dia que eu decidi organizar um armário e desisti na metade',
      'A lista de compras que eu nunca sigo no mercado',
      'Café da manhã em pé porque atrasei',
      'A parede que eu quero pintar há um ano',
      'Domingo de faxina que vira documentário no fundo',
    ],
  },
  {
    categoria: 'Fé',
    temas: [
      'O versículo que grudou sem eu pedir',
      'Rezar no trânsito porque não deu tempo antes',
      'A dúvida que eu não conto pra ninguém da igreja',
      'Gratidão em dia que não teve nada de especial',
      'A oração que eu repito sem prestar atenção',
    ],
  },
  {
    categoria: 'Comprinhas & Achados',
    temas: [
      'O item que ficou 3 meses no carrinho até eu comprar',
      'A resenha que me convenceu contra minha vontade',
      'O produto que todo mundo recomendou e eu não gostei',
      'A promoção que eu jurei que não ia cair',
      'O achado de R$15 que virou queridinho',
    ],
  },
  {
    categoria: 'Hobbies & Gostos',
    temas: [
      'O podcast que eu escuto lavando louça',
      'A receita que eu erro sempre do mesmo jeito',
      'O documentário que eu assisto sozinha porque ninguém quer',
      'A playlist que muda meu humor em 2 minutos',
      'O hobby que eu larguei e quero retomar',
    ],
  },
  {
    categoria: 'Vida',
    temas: [
      'A ligação que eu adio há semanas',
      'O silêncio que eu preciso depois de um dia cheio',
      'A frase da minha avó que eu repito sem perceber',
      'O jeito que eu percebo que preciso descansar',
      'A saudade de uma fase que eu não queria voltar, só visitar',
    ],
  },
]

// Detecta se dois textos são essencialmente o mesmo conteúdo (repetição literal
// ou reformulação próxima) — usado para não exibir duas vezes o exercício
// prático/CTA quando a IA acaba repetindo o mesmo texto em campos diferentes.
function normalizeForCompare(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNearDuplicateText(a, b) {
  const na = normalizeForCompare(a)
  const nb = normalizeForCompare(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 2))
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 2))
  if (!wordsA.size || !wordsB.size) return false
  let shared = 0
  wordsA.forEach((w) => { if (wordsB.has(w)) shared += 1 })
  const overlap = shared / Math.min(wordsA.size, wordsB.size)
  return overlap > 0.6
}

// Remove o exercício prático da legenda quando a IA o repete lá (a legenda
// deve trazer só a observação seca; o exercício já tem seu próprio card).
function getCleanLegenda(legenda, exercicio) {
  if (!legenda) return legenda
  if (!exercicio) return legenda
  const paragraphs = legenda.split(/\n\s*\n/)
  if (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1]
    if (isNearDuplicateText(last, exercicio)) {
      return paragraphs.slice(0, -1).join('\n\n').trim() || ''
    }
  }
  if (isNearDuplicateText(legenda, exercicio)) return ''
  return legenda
}

/* ── Componente Principal ── */
export default function UnifiedCreator({ persona = 'trabalho' }) {
  const navigate = useNavigate()
  const isPessoal = persona === 'pessoal'
  const brandVoice = useStore(s => s.brandVoice)
  const dislikedContent = useStore(s => s.dislikedContent)
  const addDislike = useStore(s => s.addDislike)
  const addFavorite = useStore(s => s.addFavorite)
  const addIdea = useStore(s => s.addIdea)
  const bannedWords = useStore(s => s.bannedWords) || []
  const addBannedWord = useStore(s => s.addBannedWord)
  const removeBannedWord = useStore(s => s.removeBannedWord)

  const [input, setInput] = useState('')
  const [briefing, setBriefing] = useState('')
  const [briefingName, setBriefingName] = useState('')
  const [format, setFormat] = useState(null) // null = auto-detect
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const briefingRef = useRef(null)
  const [showFormats, setShowFormats] = useState(false)
  const [history, setHistory] = useState([]) // versões anteriores
  const [showHistory, setShowHistory] = useState(false)
  const [adjusting, setAdjusting] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [banCandidate, setBanCandidate] = useState(null)
  const [banPosition, setBanPosition] = useState({ x: 0, y: 0 })
  const [inspiration, setInspiration] = useState(null)
  const [brandViolations, setBrandViolations] = useState([])
  const [showLinter, setShowLinter] = useState(false)
  const linterTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // ── Modo Engajamento ──
  const [mode, setMode] = useState('studio') // 'studio' | 'revisor' | 'engagement' | 'carousel' | 'stories'

  // ── Revisor de Texto ──
  const [revText, setRevText] = useState('')
  const [revLoading, setRevLoading] = useState(false)
  const [revResult, setRevResult] = useState(null)
  const [revError, setRevError] = useState('')
  const [revCopied, setRevCopied] = useState(false)
  const [revApplied, setRevApplied] = useState(null)
  const [revRewritten, setRevRewritten] = useState('')
  const [revRewriteLoading, setRevRewriteLoading] = useState(false)
  const [revShortened, setRevShortened] = useState('')
  const [revShortenLoading, setRevShortenLoading] = useState(false)
  const [revBanInput, setRevBanInput] = useState('')

  // Engajamento (Reels)
  const [engTema, setEngTema] = useState('')
  const [engIdeia, setEngIdeia] = useState('')
  const [engTexto, setEngTexto] = useState('')
  const [engGerarIdeia, setEngGerarIdeia] = useState(false)
  const [engGerarTexto, setEngGerarTexto] = useState(false)
  const [engLoading, setEngLoading] = useState(false)
  const [engResult, setEngResult] = useState(null)
  const [engError, setEngError] = useState(null)
  const [engCopied, setEngCopied] = useState(null)
  const [engShowEmocional, setEngShowEmocional] = useState(false)
  const [engShowProvocativo, setEngShowProvocativo] = useState(false)
  const [engHooks, setEngHooks] = useState(null)
  const [engHookLoading, setEngHookLoading] = useState(false)
  const [engHookError, setEngHookError] = useState(null)
  const [engHookCopied, setEngHookCopied] = useState(null)
  // Carrossel

  const [carTema, setCarTema] = useState('')
  const [carHooks, setCarHooks] = useState([])
  const [carHooksLoading, setCarHooksLoading] = useState(false)
  const [carActiveVersion, setCarActiveVersion] = useState('principal')
  const [carIdeia, setCarIdeia] = useState('')
  const [carTexto, setCarTexto] = useState('')
  const [carGerarIdeia, setCarGerarIdeia] = useState(false)
  const [carGerarTexto, setCarGerarTexto] = useState(false)
  const [carTemplate, setCarTemplate] = useState(null)
  const [carTargetER, setCarTargetER] = useState('')
  const [carLoading, setCarLoading] = useState(false)
  const [carResult, setCarResult] = useState(null)
  const [carError, setCarError] = useState(null)
  const [carCopied, setCarCopied] = useState(null)
  const [carSavedHub, setCarSavedHub] = useState(false)
  const [engSavedHub, setEngSavedHub] = useState(false)
  const [strSavedHub, setStrSavedHub] = useState(false)
  // Stories
  const [strTema, setStrTema] = useState('')
  const [strEstrutura, setStrEstrutura] = useState('observacao')
  const [strLoading, setStrLoading] = useState(false)
  const [strResult, setStrResult] = useState(null)
  const [strError, setStrError] = useState(null)
  const [strCopied, setStrCopied] = useState(false)

  // ── Banco de Temas ──
  const [bankOpenCategory, setBankOpenCategory] = useState(null)

  const categorizeTheme = (tema) => {
    const t = tema.toLowerCase()
    if (isPessoal) {
      if (/naomi|cachorr|pet|buldogue|bulldog/.test(t)) return 'Naomi'
      if (/casa|decora|cozinha|planta|apartamento|reforma|fax|limpeza|rotina/.test(t)) return 'Casa & Rotina'
      if (/f[ée]\b|deus|igreja|ora[çc]|b[ií]blia|culto|gratid[aã]o/.test(t)) return 'Fé'
      if (/compr|achado|shopee|amazon|resenha|make|skincare|roupa|look|unboxing/.test(t)) return 'Comprinhas & Achados'
      if (/livro|s[ée]rie|filme|viagem|restaurante|caf[ée]|m[uú]sica|treino|corrida|hobby|receita/.test(t)) return 'Hobbies & Gostos'
      return 'Vida'
    }
    if (/\bia\b|intelig[eê]ncia artificial|automa[çc]|chatgpt|algoritmo|ferramenta|software|dados|machine|llm|prompt/.test(t)) return 'IA e Futuro do Trabalho'
    if (/reuni[aã]o|gestor|empresa|corporat|chefe|pol[ií]tica|feedback|equipe|\btime\b|cargo|hierarquia|escrit[oó]rio|demiss|colega/.test(t)) return 'Dinâmicas Corporativas'
    if (/decid|decis[aã]o|escolha|op[çc][aã]o|dilema|paralisa|risco|incerteza|\bsair\b|\bficar\b|mudan[çc]a/.test(t)) return 'Tomada de Decisão'
    if (/perfeccion|procrastin|impostor|s[ií]ndrome|ansiedade|burnout|valida[çc]|inseguran[çc]|merecer|autoconfian|reconhecimento/.test(t)) return 'Maturidade Profissional'
    return 'Carreira'
  }

  // Banco de temas separado por persona: vida e trabalho não se misturam
  const themesKey = isPessoal ? 'cio-saved-themes-pessoal' : 'cio-saved-themes'

  const [savedThemes, setSavedThemes] = useState(() => {
    try {
      let raw = JSON.parse(localStorage.getItem(themesKey) || '[]')
      if (raw.length > 0 && typeof raw[0] === 'string') {
        raw = raw.map((t, i) => ({ id: Date.now() + i, tema: t, categoria: isPessoal ? 'Vida' : 'Carreira', fonte: 'manual', criadoEm: new Date().toISOString().slice(0, 10) }))
      } else {
        // migrar itens sem categoria
        raw = raw.map(item => ({ ...item, categoria: item.categoria || (isPessoal ? 'Vida' : 'Carreira') }))
      }
      // Sanitização: uma versão anterior vazava temas entre os estúdios (componente
      // não remontava na troca de rota). Cada banco fica só com categorias da sua persona.
      raw = isPessoal
        ? raw.filter(t => PERSONAL_CATEGORIES.includes(t.categoria))
        : raw.filter(t => !PERSONAL_CATEGORIES.includes(t.categoria))
      // Banco pessoal vazio nasce semeado com temas de vida
      if (raw.length === 0 && isPessoal) {
        return PERSONAL_SEED_THEMES.map((t, i) => ({
          id: Date.now() + i, ...t, fonte: 'seed', criadoEm: new Date().toISOString().slice(0, 10),
        }))
      }
      return raw
    } catch { return [] }
  })
  const [newThemeInput, setNewThemeInput] = useState('')
  const [showThemesPanel, setShowThemesPanel] = useState(true)
  const [expandingThemes, setExpandingThemes] = useState(false)
  const [categorizingThemes, setCategorizingThemes] = useState(false)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    localStorage.setItem(themesKey, JSON.stringify(savedThemes))
  }, [savedThemes, themesKey])

  // ── Brand Linter com debounce ──
  useEffect(() => {
    if (linterTimeoutRef.current) clearTimeout(linterTimeoutRef.current)

    if (!input.trim()) {
      setBrandViolations([])
      setShowLinter(false)
      return
    }

    linterTimeoutRef.current = setTimeout(() => {
      const violations = lintText(input)
      setBrandViolations(violations)
      setShowLinter(violations.length > 0)
    }, 500) // 500ms debounce

    return () => {
      if (linterTimeoutRef.current) clearTimeout(linterTimeoutRef.current)
    }
  }, [input])

  const handleBriefingUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBriefingName(file.name)
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map(item => item.str).join(' ') + '\n\n'
        }
        setBriefing(text.trim())
      } catch { setBriefing(''); setError('Erro ao ler PDF') }
    } else {
      const reader = new FileReader()
      reader.onload = () => setBriefing(reader.result)
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  /* ── Reescrita corretiva anti-clichê ──
     O filtro no prompt é probabilístico: o modelo às vezes emite a estrutura
     proibida mesmo assim. Quando o detector determinístico encontra um bloco,
     esta chamada reescreve só os trechos apontados antes de mostrar na tela. */
  const rewriteWithoutCliches = async (text, hits) => {
    const list = hits.map(h => `- ${h.label}: "${h.match}"`).join('\n')
    const res = await fetch('/api/ai?action=anthropic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: withManualOperacional(ANTI_AI_FILTER),
        messages: [{
          role: 'user',
          content: `O texto abaixo saiu com padrões proibidos pelo filtro de autenticidade. Reescreva SOMENTE os trechos apontados, em declaração direta (sujeito + verbo + complemento, sem negação prévia, sem contraste corretivo, sem pergunta retórica no fechamento — fechamento é conclusão prática, dado ou observação seca). Mantenha todo o resto idêntico: estrutura, quebras de linha, indicações. Retorne APENAS o texto completo corrigido, sem comentários.\n\nPADRÕES ENCONTRADOS:\n${list}\n\nTEXTO:\n${text}`,
        }],
      }),
    })
    if (!res.ok) throw new Error(`Erro ${res.status}`)
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || text
  }

  /* ── Gerar conteúdo ── */
  const generate = async (overrides = {}) => {
    const text = overrides.input || input
    if (!text.trim()) return
    if (!apiKey) { setError('Configure sua API key em Analytics > Configurações'); return }

    setLoading(true)
    setError(null)
    if (overrides.adjustment) setAdjusting(overrides.adjustment)

    // No modo pessoal a voz de marca profissional fica de fora; frases proibidas e dislikes continuam
    const voiceCtx = buildVoiceContext(isPessoal ? null : brandVoice, dislikedContent, bannedWords)
    const regenInstr = overrides.regen ? buildRegenerateInstruction(history.length) : ''
    const selectedFormat = overrides.format || format

    const prompt = `${isPessoal ? PERSONAL_MASTER_PROMPT : MASTER_PROMPT}
${voiceCtx}
${regenInstr}

${overrides.adjustment ? ADJUSTMENT_PROMPTS[overrides.adjustment] : ''}

${overrides.adaptFrom ? `CONTEÚDO ORIGINAL PARA ADAPTAR:\n"""\n${overrides.adaptFrom}\n"""\n\nADAPTE o conteúdo acima mantendo a mesma essência, tom e mensagem.` : ''}

${inspiration ? `ROTEIRO DE INSPIRAÇÃO (DE REFERÊNCIA EXTERNA):
"""
${inspiration}
"""
Use este roteiro como inspiração para gerar o conteúdo. Mantenha os elementos principais mas refine para o DNA da Karen.
` : ''}

${briefing ? `BRIEFING DA MARCA/CLIENTE ANEXADO:
"""
${briefing.slice(0, 6000)}
"""
IMPORTANTE: O conteúdo deve ser SOBRE A MARCA/CLIENTE do briefing. Karen é a criadora que produz, mas o conteúdo fala sobre o que a marca quer comunicar. Use produtos, mensagens e diretrizes do briefing.
` : ''}

PEDIDO DO USUÁRIO: "${text}"

${selectedFormat ? FORMAT_PROMPTS[selectedFormat] : `DETECTE automaticamente o melhor formato baseado no tema. Escolha entre: Reels, Carrossel, Caption, Thread ou Stories.`}

Responda EXCLUSIVAMENTE com JSON válido:
{
  "detected_context": "${isPessoal ? 'diario|cotidiano|observacao' : 'reflexivo|engracado|mentora'}",
  "detected_context_reason": "por que este contexto foi escolhido (1 frase)",
  "suggested_format": "reels|carrossel|caption|thread|stories",
  "format_reason": "por que este formato é o melhor (1 frase)",
  "title": "título principal curto",
  "title_options": ["título viral 1 (máx 8 palavras)", "título viral 2", "título viral 3", "título viral 4", "título viral 5"],
  "content": "o conteúdo completo no formato escolhido, com todas as indicações",
  "caption": "legenda para o post (se aplicável)",
  "hashtags": ["#tag1", "#tag2"],
  "filmmaker_tip": "dica prática de filmagem mobile (se formato é vídeo)",
  "hook_alternatives": ["gancho alternativo 1", "gancho alternativo 2"]
}

REGRA PARA TÍTULOS: Gere 5 opções de título que sejam CURTOS (máx 8 palavras), virais e persuasivos. Devem gerar curiosidade sem ser clickbait extremista ou apelativo. Pense em títulos que fariam alguém parar o scroll. Nada genérico.`

    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const jsonText = data.content?.[0]?.text || ''
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta inválida')

      const parsed = JSON.parse(jsonMatch[0])

      // Passagem determinística anti-clichê sobre o texto gerado
      try {
        for (const field of ['content', 'caption']) {
          const hits = detectCliches(parsed[field]).blocks
          if (hits.length) parsed[field] = await rewriteWithoutCliches(parsed[field], hits)
        }
      } catch { /* se a correção falhar, mantém o texto original */ }

      // Salvar no histórico antes de atualizar
      if (result) setHistory(prev => [result, ...prev].slice(0, 10))

      setResult(parsed)
      if (!format && parsed.suggested_format) setFormat(parsed.suggested_format)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setAdjusting(null)
    }
  }

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Revisor de Texto: análise, reescrita e encurtamento ──
  async function revisorAnalyze() {
    if (!revText.trim() || !apiKey) { setRevError(!apiKey ? 'Configure sua API key em Configurações.' : ''); return }
    setRevLoading(true); setRevResult(null); setRevError(''); setRevRewritten('')
    const bannedList = bannedWords.length
      ? `\n\nFRASES ABSOLUTAMENTE PROIBIDAS — nunca use estas expressões nas sugestões, nem variações delas:\n${bannedWords.map(p => `- "${p}"`).join('\n')}\nSe uma sugestão contiver qualquer uma dessas frases → reescreva do zero.`
      : ''
    const prompt = `Você é um revisor especialista em conteúdo para criadores digitais brasileiros. Analise o texto e retorne APENAS um JSON válido:
{"score":<0-100>,"dimensoes":{"clareza":<0-100>,"tom":<0-100>,"impacto":<0-100>,"autenticidade":<0-100>},"parecer":"<frase resumo>","linguagem_robotica":["<trecho artificial>"],"sugestoes":[{"problema":"<trecho original>","melhoria":"<versão melhorada>"}],"pontos_fortes":["<ponto>"]}
${bannedList}
TEXTO:\n${revText.trim()}`
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('inválido')
      const parsed = JSON.parse(match[0])
      // Detector determinístico: garante que estrutura proibida aparece na análise
      // mesmo quando o modelo deixa passar
      const det = detectCliches(revText)
      const detected = [...det.blocks, ...det.warns].map(h => `"${h.match}" — ${h.label}`)
      if (detected.length) {
        parsed.linguagem_robotica = [...new Set([...(parsed.linguagem_robotica || []), ...detected])]
      }
      setRevResult(parsed)
    } catch {
      setRevError('Erro ao analisar. Verifique sua API key.')
    } finally {
      setRevLoading(false)
    }
  }

  function revisorApply(problema, melhoria, idx) {
    setRevText(prev => prev.includes(problema) ? prev.replace(problema, melhoria) : prev.replace(problema.trim(), melhoria))
    setRevApplied(idx)
    setTimeout(() => {
      setRevResult(prev => prev ? { ...prev, sugestoes: prev.sugestoes.filter((_, i) => i !== idx) } : prev)
      setRevApplied(null)
    }, 600)
  }

  async function revisorShorten() {
    if (!revText.trim() || !apiKey) return
    setRevShortenLoading(true); setRevShortened('')
    const bannedList = bannedWords.length
      ? `\n\nFRASES ABSOLUTAMENTE PROIBIDAS:\n${bannedWords.map(p => `- "${p}"`).join('\n')}`
      : ''
    const prompt = `Reescreva o texto abaixo de forma MAIS CURTA E SUCINTA — corte pelo menos 30% das palavras sem perder nenhuma ideia central.

REGRAS OBRIGATÓRIAS:
- Elimine frases redundantes, explicações desnecessárias e repetições
- Cada frase deve ganhar peso — se não acrescenta, corta
- Mantenha o gancho de abertura e o CTA final intactos
- Preserve o tom e a voz originais — apenas enxugue, não mude o estilo
- Mantenha a estrutura de parágrafos — NÃO junte tudo em um bloco
- O resultado deve soar mais direto e preciso, não truncado${bannedList}

Retorne APENAS o texto encurtado, sem introdução nem comentários.

TEXTO:
${revText.trim()}`
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      setRevShortened(data.content?.[0]?.text?.trim() || '')
    } catch {
      /* silent */
    } finally {
      setRevShortenLoading(false)
    }
  }

  async function revisorRewrite() {
    if (!revResult?.sugestoes?.length || !apiKey) return
    setRevRewriteLoading(true); setRevRewritten('')
    const list = revResult.sugestoes.map((s, i) => `${i + 1}. "${s.problema}" → "${s.melhoria}"`).join('\n')
    const bannedList = bannedWords.length
      ? `\n\nFRASES ABSOLUTAMENTE PROIBIDAS — nunca use no texto reescrito:\n${bannedWords.map(p => `- "${p}"`).join('\n')}`
      : ''
    const prompt = `Reescreva o texto incorporando as melhorias. Preserve estilo e voz. Retorne APENAS o texto reescrito.${bannedList}\n\nTEXTO:\n${revText.trim()}\n\nMELHORIAS:\n${list}`
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      setRevRewritten(data.content?.[0]?.text?.trim() || '')
    } catch {
      /* silent */
    } finally {
      setRevRewriteLoading(false)
    }
  }

  const handleAdapt = (newFormat) => {
    if (!result) return
    setFormat(newFormat)
    generate({ format: newFormat, adaptFrom: result.content })
  }

  const handleDislike = () => {
    if (result) {
      addDislike({ title: result.title, reason: 'Não gostei da abordagem', hook: result.content?.slice(0, 100) })
      generate({ regen: true })
    }
  }

  const handleFavorite = () => {
    if (result) {
      addFavorite({ type: 'content', title: result.title, content: result.content, format: result.suggested_format })
    }
  }

  const handleSaveIdea = () => {
    if (result) {
      addIdea({ title: result.title, description: result.content?.slice(0, 200), format: result.suggested_format, tags: result.hashtags?.slice(0, 3)?.map(t => t.replace('#', '')) || [] })
    }
  }

  const handleEngCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setEngCopied(key)
    setTimeout(() => setEngCopied(null), 2000)
  }

  const generateEngagement = async () => {
    if (!engTema.trim()) return
    if (!apiKey) { setEngError('Configure sua API key em Analytics > Configurações'); return }
    setEngLoading(true)
    setEngError(null)
    setEngResult(null)
    setEngSavedHub(false)
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 5000,
          system: ENGAGEMENT_SYSTEM,
          messages: [{ role: 'user', content: buildEngagementPrompt({ tema: engTema, ideia: engIdeia, texto: engTexto, gerarIdeia: engGerarIdeia, gerarTexto: engGerarTexto }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setEngResult(JSON.parse(match[0]))
    } catch (err) {
      setEngError(err.message)
    } finally {
      setEngLoading(false)
    }
  }

  const generateReelsHooks = async () => {
    if (!engTema.trim()) return
    if (!apiKey) { setEngHookError('Configure sua API key.'); return }
    setEngHookLoading(true)
    setEngHookError(null)
    setEngHooks(null)
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          system: buildHookSystem(isPessoal),
          messages: [{ role: 'user', content: buildHookPrompt(engTema, engResult?.versao_principal, isPessoal) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setEngHooks(JSON.parse(match[0]))
    } catch (err) {
      setEngHookError(err.message)
    } finally {
      setEngHookLoading(false)
    }
  }

  const handleEngHookCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setEngHookCopied(key)
    setTimeout(() => setEngHookCopied(null), 2000)
  }

  const generateHooks = async () => {
    if (!apiKey) { return }
    setCarHooksLoading(true)
    setCarHooks([])
    try {
      const tema = carTema.trim() || (isPessoal ? 'vida e cotidiano' : 'carreira e maturidade profissional')
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: `Você gera hooks para o slide 1 de carrosséis do Instagram para Karen Santos.
${isPessoal
    ? 'Neste modo Karen NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, a Naomi, fé, comprinhas, hobbies, o cotidiano que a torna humana. PROIBIDO puxar pra carreira, tecnologia ou mundo corporativo.'
    : 'Nicho: Carreira, Maturidade Profissional e Tomada de Decisão. Audiência corporativa sênior.'}

PRINCÍPIO CENTRAL:
O hook não pode ser conceito. Tem que ser situação + comportamento.
A pessoa para porque se reconheceu numa cena, não porque achou a frase bonita.

ANTES (errado):
→ conceito abstrato que cabe em qualquer contexto
→ parece frase de Pinterest
→ não cria imagem na cabeça

DEPOIS (certo):
→ situação concreta que a pessoa já viveu
→ comportamento real que ela reconhece em si mesma
→ cria uma cena visual imediata

EXEMPLOS DO QUE FUNCIONA:
${isPessoal ? `- "eu juro que ia arrumar só uma gaveta… quatro horas depois"
- "tem gente que reza mais no trânsito do que na igreja… eu incluída"
- "a Naomi decide o dia dela antes de mim"
- "comprar também é uma forma de descansar mesmo quando parece besteira"
- "domingo chega e eu já sei que vou adiar a mesma coisa"` : `- "você já pensou em sair… e ficou mesmo assim?"
- "tem gente que reclama do trabalho todo dia… mas não consegue sair"
- "tem decisão que a gente adia… e chama de 'pensar melhor'"
- "ficar também é uma escolha mesmo quando parece que não é"
- "segunda-feira chega e você já sabe que não queria estar ali"`}

REGRAS:
- Curto — entre 6 e 18 palavras. Pode ter quebra de linha com "…"
- Tom oral. Como quem falou isso num áudio, não escreveu num post
- Proibido: "ninguém fala sobre", "a verdade é", "o segredo", "você precisa saber", superlativo, exclamação, maiúsculas dramáticas
- Proibido: abstração sem cena ("a pressão do ambiente", "o peso das decisões")
- Cada hook tem que passar no teste: "isso parece algo que alguém viveu… ou algo que alguém escreveu?" — só entrega se parecer vivido

Gere exatamente 5 hooks para o tema dado. Responda EXCLUSIVAMENTE com JSON: {"hooks": ["hook1","hook2","hook3","hook4","hook5"]}`,
          messages: [{ role: 'user', content: `Tema: ${tema}` }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        setCarHooks(parsed.hooks || [])
      }
    } catch { /* silencioso */ } finally {
      setCarHooksLoading(false)
    }
  }

  const generateCarousel = async () => {
    if (!carTema.trim()) return
    if (!apiKey) { setCarError('Configure sua API key em Analytics > Configurações'); return }
    setCarLoading(true)
    setCarError(null)
    setCarResult(null)
    setCarSavedHub(false)
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 5000,
          system: buildCarouselSystem(isPessoal),
          messages: [{ role: 'user', content: buildCarouselPrompt({ tema: carTema, ideia: carIdeia, texto: carTexto, gerarIdeia: carGerarIdeia, gerarTexto: carGerarTexto, template: !isPessoal && carTemplate ? CAROUSEL_TEMPLATES[carTemplate] : null, targetER: carTargetER }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setCarResult(JSON.parse(match[0]))
    } catch (err) {
      setCarError(err.message)
    } finally {
      setCarLoading(false)
    }
  }

  const handleCarCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCarCopied(key)
    setTimeout(() => setCarCopied(null), 2000)
  }

  const handleCarSaveHub = () => {
    if (!carResult) return
    const fmtSlides = (version) =>
      (version?.slides || []).map(s => `[${s.numero}] ${s.texto}`).join('\n')
    const scriptCompleto = [
      '=== VERSÃO PRINCIPAL ===\n' + fmtSlides(carResult.versao_principal),
      carResult.versao_principal?.pergunta_final
        ? `Pergunta: ${carResult.versao_principal.pergunta_final}` : '',
      carResult.variacao_emocional
        ? '\n=== VARIAÇÃO EMOCIONAL ===\n' + fmtSlides(carResult.variacao_emocional)
          + (carResult.variacao_emocional.pergunta_final ? `\nPergunta: ${carResult.variacao_emocional.pergunta_final}` : '')
        : '',
      carResult.variacao_provocativa
        ? '\n=== VARIAÇÃO PROVOCATIVA ===\n' + fmtSlides(carResult.variacao_provocativa)
          + (carResult.variacao_provocativa.pergunta_final ? `\nPergunta: ${carResult.variacao_provocativa.pergunta_final}` : '')
        : '',
      carResult.legenda
        ? `\n--- LEGENDA ---\n${carResult.legenda}` : '',
      carResult.comentarios?.length
        ? '\n--- COMENTÁRIOS PREVISTOS ---\n' +
          carResult.comentarios.map(c => `● "${c.comentario}"\n→ ${c.resposta}`).join('\n\n')
        : '',
    ].filter(Boolean).join('\n')
    addIdea({
      title: carTema,
      description: fmtSlides(carResult.versao_principal),
      script: scriptCompleto,
      caption: carResult.legenda || '',
      cta: carResult.versao_principal?.pergunta_final || '',
      format: 'carrossel',
      platform: 'instagram',
      platforms: ['instagram'],
      priority: 'medium',
      status: 'ready',
      tags: [
        'protocolo-carrossel',
        carTema.toLowerCase().slice(0, 20),
        ...(carTemplate ? [CAROUSEL_TEMPLATES[carTemplate].label.toLowerCase()] : []),
      ],
      source: carTemplate
        ? `Protocolo de Carrossel — ${CAROUSEL_TEMPLATES[carTemplate].label}${carTargetER ? ` — Meta E/R ${carTargetER}%` : ''}`
        : 'Protocolo de Carrossel',
    })
    setCarSavedHub(true)
  }

  const handleEngSaveHub = () => {
    if (!engResult) return
    const scriptCompleto = [
      engResult.versao_principal,
      engResult.variacao_emocional   ? `\n\n--- VARIAÇÃO EMOCIONAL ---\n${engResult.variacao_emocional}` : '',
      engResult.variacao_provocativa ? `\n\n--- VARIAÇÃO PROVOCATIVA ---\n${engResult.variacao_provocativa}` : '',
      engResult.pergunta_final       ? `\n\n--- PERGUNTA FINAL ---\n${engResult.pergunta_final}` : '',
      engResult.respostas_sugeridas?.length
        ? `\n\n--- RESPOSTAS PARA COMENTÁRIOS ---\n${engResult.respostas_sugeridas.join('\n')}`
        : '',
      engResult.nota_estrategica
        ? `\n\n--- NOTA ESTRATÉGICA ---\n${engResult.nota_estrategica}`
        : '',
    ].filter(Boolean).join('')
    addIdea({
      title: engTema,
      description: engResult.versao_principal,
      script: scriptCompleto,
      caption: engResult.pergunta_final || '',
      cta: (engResult.respostas_sugeridas || []).join('\n'),
      format: 'reel',
      platform: 'instagram',
      platforms: ['instagram'],
      priority: 'medium',
      status: 'ready',
      tags: ['protocolo-reels', engTema.toLowerCase().slice(0, 20)],
      source: 'Protocolo Anti-Emoji',
    })
    setEngSavedHub(true)
  }

  const handleStrCopy = () => {
    if (!strResult) return
    navigator.clipboard.writeText(strResult)
    setStrCopied(true)
    setTimeout(() => setStrCopied(false), 2000)
  }

  const handleStrSaveHub = () => {
    if (!strResult) return
    const estrutura = (isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES)[strEstrutura]
    addIdea({
      title: strTema,
      description: strResult.slice(0, 300),
      script: strResult,
      caption: '',
      cta: '',
      format: 'stories',
      platform: 'instagram',
      platforms: ['instagram'],
      priority: 'medium',
      status: 'ready',
      tags: ['protocolo-stories', estrutura?.label.toLowerCase() || '', strTema.toLowerCase().slice(0, 20)].filter(Boolean),
      source: `Protocolo de Stories — ${estrutura?.label || ''}`,
    })
    setStrSavedHub(true)
  }

  const generateStories = async () => {
    if (!strTema.trim()) return
    if (!apiKey) { setStrError('Configure sua API key em Configurações'); return }
    setStrLoading(true)
    setStrError(null)
    setStrResult(null)
    setStrSavedHub(false)
    try {
      const structuresMap = isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES
      const estrutura = structuresMap[strEstrutura] || structuresMap.observacao
      const systemPrompt = buildStoriesSystem(isPessoal)
        .replace('{tema}', strTema)
        .replace('{estrutura}', estrutura.prompt)
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: 'Gere o stories agora.' }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const text = data.content?.[0]?.text?.trim() || ''
      if (!text) throw new Error('Resposta inválida da IA')
      setStrResult(text)
    } catch (err) {
      setStrError(err.message)
    } finally {
      setStrLoading(false)
    }
  }

  const applyTheme = (tema) => {
    if (mode === 'engagement') setEngTema(tema)
    else if (mode === 'carousel') setCarTema(tema)
    else if (mode === 'stories') setStrTema(tema)
    else setInput(tema)
  }

  const analyzeTemperatures = async (targets) => {
    if (!apiKey || targets.length === 0) return
    setSavedThemes(prev => prev.map(t =>
      targets.some(tg => tg.id === t.id) ? { ...t, temperatura: 'analyzing' } : t
    ))
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 800,
          messages: [{ role: 'user', content: `Analise a temperatura de engajamento dos temas abaixo para uma criadora de conteúdo de carreira, tecnologia e comportamento profissional no Brasil. Audiência majoritariamente corporativa.

Temperatura:
- quente: alto potencial viral agora, gera forte identificação, timely
- morno: relevante mas sem urgência
- frio: evergreen, pouco senso de urgência

Seja honesto e crítico. Não infle. Considere ressonância emocional, compartilhabilidade e identificação da audiência.

Temas:
${targets.map(t => `- ${t.tema}`).join('\n')}

Responda EXCLUSIVAMENTE com JSON válido:
{"resultados": [{"tema": "...", "temperatura": "quente|morno|frio", "motivo": "1 frase direta e seca"}]}` }],
        }),
      })
      const data = await res.json()
      const match = (data.content?.[0]?.text || '').match(/\{[\s\S]*\}/)
      if (match) {
        const results = JSON.parse(match[0]).resultados || []
        setSavedThemes(prev => prev.map(t => {
          if (!targets.some(tg => tg.id === t.id)) return t
          const r = results.find(r => r.tema === t.tema)
          return r ? { ...t, temperatura: r.temperatura, motivo: r.motivo } : { ...t, temperatura: null }
        }))
      }
    } catch {
      setSavedThemes(prev => prev.map(t =>
        targets.some(tg => tg.id === t.id) ? { ...t, temperatura: null } : t
      ))
    }
  }

  const addTheme = async () => {
    const existing = new Set(savedThemes.map(s => s.tema))
    const now = new Date().toISOString().slice(0, 10)
    const novos = newThemeInput
      .split(',')
      .map(t => t.replace(/^[\s–\-•]+/, '').trim())
      .filter(t => t.length > 0 && !existing.has(t))
    if (novos.length === 0) return
    setNewThemeInput('')
    setCategorizingThemes(true)

    const categorias = isPessoal
      ? PERSONAL_CATEGORIES
      : ['Carreira', 'Maturidade Profissional', 'Tomada de Decisão', 'Dinâmicas Corporativas', 'IA e Futuro do Trabalho']

    let classificados = novos.map((t, i) => ({ id: Date.now() + i, tema: t, categoria: categorizeTheme(t), fonte: 'manual', criadoEm: now }))

    if (apiKey) {
      try {
        const res = await fetch('/api/ai?action=anthropic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 400,
            system: `Classifique cada tema na categoria mais adequada. Categorias disponíveis: ${categorias.join(', ')}.
Responda EXCLUSIVAMENTE com JSON: [{"tema": "...", "categoria": "..."}]
Regras:
${isPessoal
    ? `- Cachorra, pet, buldogue, bicho → "Naomi"
- Casa, decoração, cozinha, faxina, rotina doméstica → "Casa & Rotina"
- Fé, oração, igreja, gratidão, espiritualidade → "Fé"
- Compras, achados, resenhas de produto, unboxing → "Comprinhas & Achados"
- Livros, séries, viagens, comida, música, treino, hobbies → "Hobbies & Gostos"
- Sentimentos, manias, memórias, família, cenas banais do dia → "Vida"`
    : `- IA, automação, substituição por tecnologia, ferramentas digitais → "IA e Futuro do Trabalho"
- Reuniões, gestores, liderança, política de escritório, equipe, hierarquia → "Dinâmicas Corporativas"
- Decisões difíceis, escolhas, dilemas, paralisação, mudar ou ficar → "Tomada de Decisão"
- Perfeccionismo, síndrome do impostor, medo de errar, autoconfiança, burnout → "Maturidade Profissional"
- Promoção, emprego, mercado, salário, transição de carreira → "Carreira"`}`,
            messages: [{ role: 'user', content: `Temas:\n${novos.map((t, i) => `${i + 1}. ${t}`).join('\n')}` }],
          }),
        })
        const data = await res.json()
        const text = data.content?.[0]?.text || ''
        const match = text.match(/\[[\s\S]*\]/)
        if (match) {
          const parsed = JSON.parse(match[0])
          classificados = novos.map((t, i) => ({
            id: Date.now() + i,
            tema: t,
            categoria: parsed.find(p => p.tema === t)?.categoria || categorizeTheme(t),
            fonte: 'manual',
            criadoEm: now,
          }))
        }
      } catch { /* usa fallback regex */ }
    }

    setSavedThemes(prev => [...classificados, ...prev])
    setCategorizingThemes(false)
  }

  const removeTheme = (id) => setSavedThemes(prev => prev.filter(t => t.id !== id))

  const addThemeFromSuggestion = (tema, categoria) => {
    const existing = new Set(savedThemes.map(s => s.tema))
    if (existing.has(tema)) return
    const entry = { id: Date.now(), tema, categoria, fonte: 'manual', criadoEm: new Date().toISOString().slice(0, 10) }
    setSavedThemes(prev => [entry, ...prev])
  }

  const expandThemes = async () => {
    if (!apiKey) return
    const categoria = bankOpenCategory
    const temasNaCategoria = categoria ? savedThemes.filter(t => t.categoria === categoria) : savedThemes
    if (!categoria && savedThemes.length === 0) return
    setExpandingThemes(true)
    try {
      const contextoCategoria = categoria
        ? `Categoria focada: "${categoria}"\n\nTemas já existentes nessa categoria:\n${temasNaCategoria.map(t => `- ${t.tema}`).join('\n') || '(nenhum ainda)'}`
        : `Temas gerais já existentes:\n${savedThemes.map(t => `- ${t.tema}`).join('\n')}`
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
          messages: [{ role: 'user', content: `${isPessoal
            ? `Você sugere temas de conteúdo PESSOAL para uma criadora brasileira que compartilha a vida fora do trabalho: a casa, a cachorra Naomi (buldogue francês), a fé, comprinhas e achados, hobbies e cenas banais do cotidiano que geram conexão. PROIBIDO: qualquer tema de carreira, tecnologia, produtividade ou mundo corporativo. O banal específico vale mais que o grandioso.`
            : `Você é um estrategista de conteúdo para criadores na área de carreira, tecnologia e comportamento profissional no Brasil.`}

${contextoCategoria}

Gere 5 novos temas ${categoria ? `para a categoria "${categoria}"` : 'relacionados'} — específicos, concretos, com potencial de identificação. Não repita existentes. Sem linguagem de coach. Cada tema: situação real ou observação concreta. Máx 8 palavras. Inclua a temperatura de cada um.

Temperatura:
- quente: alto potencial viral agora, forte identificação
- morno: relevante mas sem urgência
- frio: evergreen, menos imediato

Responda EXCLUSIVAMENTE com JSON válido:
{"temas": [{"tema": "...", "temperatura": "quente|morno|frio", "motivo": "1 frase direta"}]}` }],
        }),
      })
      const data = await res.json()
      const match = (data.content?.[0]?.text || '').match(/\{[\s\S]*\}/)
      if (match) {
        const existing = new Set(savedThemes.map(t => t.tema))
        const novos = (JSON.parse(match[0]).temas || [])
          .filter(t => !existing.has(t.tema))
          .map(t => ({
            id: Date.now() + Math.random(),
            tema: t.tema, temperatura: t.temperatura || null, motivo: t.motivo || null,
            categoria: categoria || (isPessoal ? categorizeTheme(t.tema) : 'Carreira'),
            fonte: 'ia', criadoEm: new Date().toISOString().slice(0, 10),
          }))
        setSavedThemes(prev => [...prev, ...novos])
      }
    } catch { /* silent */ }
    finally { setExpandingThemes(false) }
  }

  const CONTEXT_COLORS = {
    reflexivo: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Reflexivo' },
    engracado: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Engraçado' },
    mentora: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Mentora' },
    // Tons do Studio Pessoal
    diario: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', label: 'Diário' },
    cotidiano: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Cotidiano' },
    observacao: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', label: 'Observação' },
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shadow-lg',
            isPessoal ? 'bg-gradient-to-br from-rose-400 to-pink-600 shadow-pink-200' : 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-200')}>
            {isPessoal ? <Heart size={20} className="text-white" /> : <PenTool size={20} className="text-white" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isPessoal ? 'Studio Pessoal' : 'Criar Conteúdo'}</h1>
            <p className="text-xs text-gray-400">
              {isPessoal
                ? 'Sua vida fora do trabalho — casa, Naomi, fé, comprinhas e o resto que te faz humana'
                : 'Descreva o que quer criar — a IA detecta o tom e formato ideal'}
            </p>
          </div>
        </div>
        {inspiration && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 border border-orange-300 text-xs font-medium text-orange-700">
            <Zap size={14} />
            Inspirado em referência
            <button onClick={() => setInspiration(null)} className="ml-1 hover:text-orange-900">✕</button>
          </div>
        )}
      </div>

      {/* ── Banco de Temas ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowThemesPanel(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-gray-700">Banco de Temas</span>
            {savedThemes.length > 0 && (
              <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {savedThemes.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">clique para usar no campo Tema</span>
            {showThemesPanel ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </button>

        {showThemesPanel && (
          <div className="border-t border-gray-100">
            {/* Actions bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/40">
              <input
                value={newThemeInput}
                onChange={e => setNewThemeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTheme()}
                placeholder="Adicione temas separados por vírgula..."
                className="input text-xs flex-1 py-1.5"
              />
              <button
                onClick={addTheme}
                disabled={!newThemeInput.trim() || categorizingThemes}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-40 shrink-0"
              >
                {categorizingThemes ? <><Loader2 size={11} className="animate-spin" /> Classificando...</> : '+ Adicionar'}
              </button>
              <button
                onClick={expandThemes}
                disabled={expandingThemes || (!bankOpenCategory && savedThemes.length === 0)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-200 transition-colors disabled:opacity-40 shrink-0"
              >
                {expandingThemes ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {bankOpenCategory ? `Expandir ${bankOpenCategory}` : 'Expandir com IA'}
              </button>
              {savedThemes.length > 0 && (
                <button
                  onClick={() => { if (window.confirm('Limpar todos os temas salvos?')) setSavedThemes([]) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shrink-0"
                >
                  <X size={11} /> Limpar
                </button>
              )}
            </div>

            {/* Accordion por categoria — temas salvos + sugestões (lista de categorias
                muda por persona: Studio Pessoal nunca deve mostrar seções profissionais) */}
            <div className="px-4 py-3 space-y-1.5">
              {(isPessoal ? PERSONAL_TEMAS_SUGESTOES : TEMAS_CARROSSEL).map(({ categoria, temas: sugestoes }) => {
                const isOpen = bankOpenCategory === categoria
                const savedInCat = savedThemes.filter(s => s.categoria === categoria)
                const savedSet = new Set(savedThemes.map(s => s.tema))
                const sugestoesNaoSalvas = sugestoes.filter(t => !savedSet.has(t))
                const totalCount = savedInCat.length
                return (
                  <div key={categoria} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setBankOpenCategory(isOpen ? null : categoria)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-orange-50 transition-colors text-left"
                    >
                      <span className="text-xs font-semibold text-gray-700">{categoria}</span>
                      <div className="flex items-center gap-2">
                        {totalCount > 0 && (
                          <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">{totalCount}</span>
                        )}
                        {isOpen ? <ChevronUp size={13} className="text-orange-500" /> : <ChevronDown size={13} className="text-gray-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="bg-white px-3 py-2 space-y-1">
                        {/* Temas salvos nesta categoria */}
                        {savedInCat.map(item => (
                          <div key={item.id} className="flex items-center gap-1.5 group">
                            <button
                              onClick={() => applyTheme(item.tema)}
                              className="flex-1 text-left text-xs text-gray-800 font-medium hover:text-orange-600 px-2.5 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                            >
                              {item.tema}
                            </button>
                            <button
                              onClick={() => removeTheme(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0 p-1"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}

                        {/* Separador só se tiver salvos e sugestões */}
                        {savedInCat.length > 0 && sugestoesNaoSalvas.length > 0 && (
                          <div className="border-t border-gray-100 my-1.5" />
                        )}

                        {/* Sugestões não salvas */}
                        {sugestoesNaoSalvas.map(tema => (
                          <button
                            key={tema}
                            onClick={() => addThemeFromSuggestion(tema, categoria)}
                            className="w-full text-left text-xs text-gray-400 hover:text-orange-600 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between gap-2"
                          >
                            <span>{tema}</span>
                            <Plus size={11} className="text-gray-300 shrink-0" />
                          </button>
                        ))}

                        {savedInCat.length === 0 && sugestoesNaoSalvas.length === 0 && (
                          <p className="text-[11px] text-gray-300 text-center py-2">Todos adicionados</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Seletor de modo ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        <button onClick={() => setMode('revisor')}
          className={clsx('flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'revisor' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-violet-600'
          )}>
          <Sparkles size={13} /> Revisor
        </button>
        <button onClick={() => setMode('studio')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'studio' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <PenTool size={13} /> Studio Livre
        </button>
        <button onClick={() => setMode('engagement')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'engagement' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <MessageCircle size={13} /> Reels
        </button>
        <button onClick={() => setMode('carousel')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'carousel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <LayoutGrid size={13} /> Carrossel
        </button>
        <button onClick={() => setMode('stories')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'stories' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <Film size={13} /> Stories
        </button>
      </div>

      {/* ── Revisor de Texto ── */}
      {mode === 'revisor' && (
        <div className="space-y-5 animate-fade-in">
          {(() => {
            const REV_DIMS = [
              { key: 'clareza', label: 'Clareza', color: '#3b82f6' },
              { key: 'tom', label: 'Tom', color: '#8b5cf6' },
              { key: 'impacto', label: 'Impacto', color: '#f59e0b' },
              { key: 'autenticidade', label: 'Autenticidade', color: '#10b981' },
            ]
            const scoreColor = revResult ? (revResult.score >= 75 ? '#10b981' : revResult.score >= 50 ? '#f59e0b' : '#ef4444') : '#e5e7eb'
            const r = 30, circ = 2 * Math.PI * r
            const offset = revResult ? circ - (revResult.score / 100) * circ : circ
            return (
              <>
                {/* Input + Analyze */}
                <div className="bg-white rounded-2xl border border-violet-100 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200 shrink-0">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Revisor de Texto</p>
                      <p className="text-xs text-gray-400">Cole qualquer texto gerado — roteiro, legenda, carrossel — e receba uma análise completa</p>
                    </div>
                  </div>
                  <textarea
                    value={revText}
                    onChange={(e) => setRevText(e.target.value)}
                    rows={7}
                    placeholder="Cole aqui o roteiro, legenda ou qualquer texto gerado para revisar..."
                    className="w-full text-sm border border-gray-200 rounded-xl p-4 resize-none outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 placeholder:text-gray-300 leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-300">{revText.length} caracteres</span>
                    {revText && <button onClick={() => { setRevText(''); setRevResult(null); setRevRewritten(''); setRevError('') }} className="text-[11px] text-gray-400 hover:text-gray-600">Limpar</button>}
                  </div>
                  {/* Frases/Palavras Banidas */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      Frases Banidas <span className="text-gray-300 font-normal">(o revisor vai sinalizar e evitar ao reescrever)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={revBanInput}
                        onChange={e => setRevBanInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && revBanInput.trim()) { addBannedWord(revBanInput.trim()); setRevBanInput('') } }}
                        placeholder='Ex: "Em resumo", "Não é à toa que..."'
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 placeholder:text-gray-300"
                      />
                      <button
                        onClick={() => { if (revBanInput.trim()) { addBannedWord(revBanInput.trim()); setRevBanInput('') } }}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Banir
                      </button>
                    </div>
                    {bannedWords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {bannedWords.map(phrase => (
                          <span key={phrase} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">
                            "{phrase.length > 35 ? phrase.slice(0, 35) + '...' : phrase}"
                            <button onClick={() => removeBannedWord(phrase)} className="hover:text-red-800 shrink-0"><X size={9} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {revError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                      <AlertCircle size={14} className="text-red-400 shrink-0" />
                      <p className="text-sm text-red-600">{revError}</p>
                    </div>
                  )}
                  <button
                    onClick={revisorAnalyze}
                    disabled={revLoading || !revText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                    style={{ background: revLoading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                  >
                    {revLoading ? <><RefreshCw size={14} className="animate-spin" /> Analisando...</> : <><Sparkles size={14} /> Revisar Texto</>}
                  </button>
                </div>

                {/* Results */}
                {revResult && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Score + Dimensions */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                      <div className="flex items-center gap-6">
                        {/* Score ring */}
                        <div className="relative w-20 h-20 shrink-0">
                          <svg width="80" height="80" className="-rotate-90">
                            <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
                            <circle cx="40" cy="40" r={r} fill="none" stroke={scoreColor} strokeWidth="6"
                              strokeDasharray={circ} strokeDashoffset={offset}
                              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-gray-800">{revResult.score}</span>
                            <span className="text-[10px] text-gray-400">/100</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Score Geral</p>
                          <p className="text-sm text-gray-700 font-medium leading-snug mb-3">{revResult.parecer}</p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {REV_DIMS.map(({ key, label, color }) => (
                              <div key={key}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] text-gray-500">{label}</span>
                                  <span className="text-[10px] font-bold text-gray-600">{revResult.dimensoes?.[key]}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${revResult.dimensoes?.[key] || 0}%`, background: color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Robotic/cliché language */}
                    {revResult.linguagem_robotica?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm space-y-3">
                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Soa artificial / clichê</p>
                        <div className="space-y-2">
                          {revResult.linguagem_robotica.map((t, i) => (
                            <div key={i} className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                              <p className="text-sm text-red-700 italic">"{t}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {revResult.sugestoes?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Sugestões de melhoria</p>
                        <div className="space-y-3">
                          {revResult.sugestoes.map((s, i) => (
                            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                              <div className="px-4 py-2.5 bg-red-50/60 border-b border-gray-100">
                                <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide mb-1">Antes</p>
                                <p className="text-sm text-gray-700 italic">"{s.problema}"</p>
                              </div>
                              <div className="px-4 py-2.5 bg-emerald-50/60">
                                <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide mb-1">Sugestão</p>
                                <p className="text-sm text-gray-800 font-medium mb-2.5">"{s.melhoria}"</p>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => revisorApply(s.problema, s.melhoria, i)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${revApplied === i ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
                                  >
                                    {revApplied === i ? <><Check size={11} /> Aplicado!</> : <><Wand2 size={11} /> Aplicar no texto</>}
                                  </button>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(s.melhoria); setRevCopied(i); setTimeout(() => setRevCopied(false), 1500) }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors"
                                  >
                                    {revCopied === i ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Rewrite + Shorten buttons */}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={revisorRewrite}
                            disabled={revRewriteLoading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                            style={{ background: revRewriteLoading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                          >
                            {revRewriteLoading ? <><RefreshCw size={14} className="animate-spin" /> Reescrevendo...</> : <><Wand2 size={14} /> Reescrever Completo</>}
                          </button>
                          <button
                            onClick={revisorShorten}
                            disabled={revShortenLoading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                            style={{ background: revShortenLoading ? '#6b7280' : 'linear-gradient(135deg, #374151, #1f2937)' }}
                          >
                            {revShortenLoading ? <><RefreshCw size={14} className="animate-spin" /> Encurtando...</> : <><Layers size={14} /> Encurtar Texto</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rewritten result */}
                    {revRewritten && (
                      <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5 shadow-sm space-y-3 animate-fade-in">
                        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Roteiro Reescrito</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{revRewritten}</p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { navigator.clipboard.writeText(revRewritten); setRevCopied('rewrite'); setTimeout(() => setRevCopied(false), 1500) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border border-violet-200 text-violet-700 hover:bg-white transition-colors"
                          >
                            {revCopied === 'rewrite' ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                          </button>
                          <button
                            onClick={() => { setRevText(revRewritten); setRevRewritten(''); setRevResult(null) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                          >
                            <Check size={13} /> Usar este texto
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Shortened result */}
                    {revShortened && (
                      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3 animate-fade-in">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Texto Encurtado</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{revShortened}</p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { navigator.clipboard.writeText(revShortened); setRevCopied('shorten'); setTimeout(() => setRevCopied(false), 1500) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-white transition-colors"
                          >
                            {revCopied === 'shorten' ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                          </button>
                          <button
                            onClick={() => { setRevText(revShortened); setRevShortened(''); setRevResult(null) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                          >
                            <Check size={13} /> Usar este texto
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {revResult.pontos_fortes?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-2">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Pontos fortes</p>
                        {revResult.pontos_fortes.map((p, i) => (
                          <p key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{p}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ── Formulário de Engajamento ── */}
      {mode === 'engagement' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <MessageCircle size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Protocolo Anti-Emoji</p>
                <p className="text-xs text-gray-400 mt-0.5">Gera roteiro otimizado para comentários reais — não emojis</p>
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                Tema <span className="text-red-400">*</span>
              </label>
              <input
                value={engTema}
                onChange={e => setEngTema(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateEngagement()}
                placeholder={isPessoal ? 'Ex: a Naomi e o sofá, comprinha de domingo, mania que herdei da minha mãe...' : 'Ex: solidão na carreira, síndrome da impostora, burnout disfarçado de produtividade...'}
                className="input text-sm w-full"
                autoFocus
              />
            </div>

            {/* Ideia */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Ideia <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setEngGerarIdeia(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    engGerarIdeia
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} />
                  {engGerarIdeia ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!engGerarIdeia && (
                <textarea
                  value={engIdeia}
                  onChange={e => setEngIdeia(e.target.value)}
                  rows={2}
                  placeholder="Uma ideia ou ângulo específico que você quer explorar..."
                  className="input text-sm w-full resize-none"
                />
              )}
              {engGerarIdeia && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-600">
                  <Sparkles size={12} /> A IA vai criar uma ideia criativa para o tema
                </div>
              )}
            </div>

            {/* Texto Base */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Texto base <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setEngGerarTexto(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    engGerarTexto
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} />
                  {engGerarTexto ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!engGerarTexto && (
                <textarea
                  value={engTexto}
                  onChange={e => setEngTexto(e.target.value)}
                  rows={3}
                  placeholder="Cole um texto, trecho, post ou rascunho que queira transformar..."
                  className="input text-sm w-full resize-none"
                />
              )}
              {engGerarTexto && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-600">
                  <Sparkles size={12} /> A IA vai criar um texto base relevante para o tema
                </div>
              )}
            </div>

            {engError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{engError}</div>
            )}

            <button
              onClick={generateEngagement}
              disabled={engLoading || !engTema.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {engLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando conteúdo...</> : <><Zap size={15} /> Gerar Conteúdo</>}
            </button>
          </div>

          {/* ── Output de Engajamento ── */}
          {engResult && (
            <div className="space-y-4 animate-fade-in">

              {/* Validação */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500" /> Protocolo de Validação
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'parece_real',            label: 'Parece real' },
                    { key: 'sem_frases_prontas',     label: 'Sem frases prontas' },
                    { key: 'sem_excesso_explicacao', label: 'Sem excesso' },
                    { key: 'espaco_aberto',          label: 'Espaço aberto' },
                  ].map(({ key, label }) => {
                    const val = engResult.validacao?.[key]
                    const ok = val === true
                    return (
                      <div key={key} className={clsx('flex flex-col items-center gap-1 p-2 rounded-xl border text-center',
                        ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                      )}>
                        <span className={clsx('text-base', ok ? 'text-emerald-500' : 'text-red-400')}>{ok ? '✓' : '✗'}</span>
                        <span className={clsx('text-[9px] font-semibold leading-tight', ok ? 'text-emerald-700' : 'text-red-600')}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Versão Principal */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Versão Principal (otimizada)</span>
                  </div>
                  <button onClick={() => handleEngCopy(engResult.versao_principal, 'principal')}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-600 transition-colors">
                    {engCopied === 'principal' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                  </button>
                </div>
                <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {engResult.versao_principal}
                </div>
              </div>

              {/* Pergunta Final */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white shadow-lg shadow-orange-200">
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold text-white/70 uppercase mb-2 flex items-center gap-1.5">
                    <Quote size={10} /> Pergunta Final (use literalmente)
                  </p>
                  <p className="text-base font-bold leading-snug">{engResult.pergunta_final}</p>
                  <button onClick={() => handleEngCopy(engResult.pergunta_final, 'pergunta')}
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all">
                    {engCopied === 'pergunta' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar pergunta</>}
                  </button>
                </div>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 translate-y-8" />
              </div>

              {/* Exercício Prático */}
              {engResult.exercicio_pratico && (
                <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-100 bg-amber-50/50">
                    <div className="flex items-center gap-2">
                      <Target size={12} className="text-amber-500" />
                      <span className="text-[10px] font-semibold text-gray-700 uppercase">Exercício Prático</span>
                    </div>
                    <button onClick={() => handleEngCopy(engResult.exercicio_pratico, 'eng-exercicio')}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-600 transition-colors">
                      {engCopied === 'eng-exercicio' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                    </button>
                  </div>
                  <p className="p-4 text-sm text-gray-800 leading-relaxed">{engResult.exercicio_pratico}</p>
                </div>
              )}

              {/* Variações */}
              <div className="space-y-2">
                {[
                  { key: 'variacao_emocional',    label: 'Variação Emocional',    color: 'rose',   dot: 'bg-rose-500',   show: engShowEmocional,    toggle: () => setEngShowEmocional(v => !v) },
                  { key: 'variacao_provocativa',   label: 'Variação Provocativa',  color: 'indigo', dot: 'bg-indigo-500', show: engShowProvocativo,   toggle: () => setEngShowProvocativo(v => !v) },
                ].map(({ key, label, color, dot, show, toggle }) => (
                  <div key={key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEngCopy(engResult[key], key) }}
                          className="text-gray-300 hover:text-gray-600 transition-colors">
                          {engCopied === key ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                        {show ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </button>
                    {show && (
                      <div className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-3">
                        {engResult[key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Gerador de Hook ── */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-amber-500" />
                    <span className="text-xs font-semibold text-gray-700">Hooks de Abertura (0-3s)</span>
                    <span className="text-[10px] text-gray-400">— o que prende antes do roteiro começar</span>
                  </div>
                  <button
                    onClick={generateReelsHooks}
                    disabled={engHookLoading}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-40"
                  >
                    {engHookLoading
                      ? <><Loader2 size={11} className="animate-spin" /> Gerando...</>
                      : engHooks
                        ? <><RefreshCw size={11} /> Regenerar</>
                        : <><Zap size={11} /> Gerar 3 Hooks</>
                    }
                  </button>
                </div>

                {engHookError && (
                  <div className="px-4 py-3 text-xs text-red-600 bg-red-50">{engHookError}</div>
                )}

                {engHooks && (
                  <div className="divide-y divide-gray-100">
                    {(engHooks.hooks || []).map((hook, i) => {
                      const tipoLabel = {
                        observacao_cortante: 'Observação Cortante',
                        dado_leitura_inesperada: 'Dado + Leitura Inesperada',
                        cena_especifica: 'Cena Específica',
                      }[hook.tipo] || hook.tipo

                      const tipoColor = {
                        observacao_cortante: 'bg-violet-100 text-violet-700 border-violet-200',
                        dado_leitura_inesperada: 'bg-blue-100 text-blue-700 border-blue-200',
                        cena_especifica: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                      }[hook.tipo] || 'bg-gray-100 text-gray-600 border-gray-200'

                      const copyText = [
                        `FRASE: ${hook.frase}`,
                        `TEXTO NA TELA: ${hook.texto_na_tela}`,
                        `ENQUADRAMENTO: ${hook.enquadramento}`,
                        `MOVIMENTO: ${hook.movimento}`,
                        `SOM: ${hook.som}`,
                      ].join('\n')

                      return (
                        <div key={i} className="px-4 py-4 space-y-3 group">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tipoColor}`}>
                              {tipoLabel}
                            </span>
                            <button
                              onClick={() => handleEngHookCopy(copyText, `hook-${i}`)}
                              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
                            >
                              {engHookCopied === `hook-${i}` ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                            </button>
                          </div>

                          {/* Frase */}
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Frase de abertura</p>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">"{hook.frase}"</p>
                          </div>

                          {/* Texto na tela */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5 w-20">Tela</span>
                            <p className="text-xs text-gray-700">{hook.texto_na_tela}</p>
                          </div>

                          {/* Enquadramento + movimento */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5 w-20">Câmera</span>
                            <p className="text-xs text-gray-700">{hook.enquadramento} · {hook.movimento}</p>
                          </div>

                          {/* Som */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5 w-20">Som</span>
                            <p className="text-xs text-gray-700">{hook.som}</p>
                          </div>

                          {/* Por que funciona */}
                          {hook.por_que_funciona && (
                            <div className="flex items-start gap-1.5 pt-1 border-t border-gray-100">
                              <span className="text-[10px] text-gray-300 mt-0.5">→</span>
                              <p className="text-[11px] text-gray-400 italic">{hook.por_que_funciona}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {!engHooks && !engHookLoading && (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs text-gray-400">
                      Gere o roteiro primeiro, depois clique em "Gerar 3 Hooks" para receber opções de abertura com indicação visual e sonora.
                    </p>
                  </div>
                )}
              </div>

              {/* Respostas Sugeridas */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                  <MessageCircle size={12} className="text-violet-500" /> Respostas para Comentários
                </p>
                <p className="text-[10px] text-gray-400">Use nos primeiros comentários para ativar conversas</p>
                <div className="space-y-2">
                  {(engResult.respostas_sugeridas || []).map((resp, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-violet-600">{i + 1}</span>
                      </div>
                      <p className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">{resp}</p>
                      <button onClick={() => handleEngCopy(resp, `resp-${i}`)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-violet-500 transition-all mt-2 shrink-0">
                        {engCopied === `resp-${i}` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota Estratégica */}
              {engResult.nota_estrategica && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Brain size={15} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-violet-600 uppercase mb-1">Nota Estratégica</p>
                    <p className="text-sm text-violet-800 leading-relaxed">{engResult.nota_estrategica}</p>
                  </div>
                </div>
              )}

              {/* Salvar + Regenerar */}
              <div className="flex gap-2">
                <button
                  onClick={handleEngSaveHub}
                  disabled={engSavedHub}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border transition-all',
                    engSavedHub
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                  )}
                >
                  {engSavedHub
                    ? <><Check size={13} /> Salvo no Hub</>
                    : <><Save size={13} /> Salvar no Hub de Ideias</>
                  }
                </button>
                {engSavedHub && (
                  <button
                    onClick={() => navigate('/ideas')}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:text-violet-600 hover:border-violet-200 rounded-xl transition-all"
                  >
                    <ExternalLink size={12} /> Abrir Hub
                  </button>
                )}
                <button
                  onClick={generateEngagement}
                  disabled={engLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={engLoading ? 'animate-spin' : ''} /> Regenerar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formulário de Carrossel ── */}
      {mode === 'carousel' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shrink-0">
                <LayoutGrid size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Protocolo de Carrossel</p>
                <p className="text-xs text-gray-400 mt-0.5">Raciocínio em sequência — não template. Cada slide puxa o próximo.</p>
              </div>
            </div>

            {/* Template de Slides — templates são de ferramentas/tech, não fazem sentido no Studio Pessoal */}
            {!isPessoal && (
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Template de slides <span className="text-gray-300">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(CAROUSEL_TEMPLATES).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCarTemplate(prev => prev === key ? null : key)}
                      title={t.desc}
                      className={clsx(
                        'text-left px-2.5 py-2 rounded-lg border transition-all',
                        carTemplate === key
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <p className="text-[11px] font-semibold leading-tight">{t.label}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 capitalize">{t.alavanca}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meta de E/R */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Meta de E/R <span className="text-gray-300">(opcional)</span>
              </label>
              <div className="relative">
                <input
                  type="number" step="0.01" min="0"
                  value={carTargetER}
                  onChange={e => setCarTargetER(e.target.value)}
                  placeholder="2,00"
                  className="input text-sm w-full pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
            </div>

            {/* Tema */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  Tema <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={() => { generateHooks(); setCarHooks([]) }}
                  disabled={carHooksLoading}
                  className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-40"
                >
                  {carHooksLoading ? <Loader2 size={10} className="animate-spin" /> : <Flame size={10} />}
                  {carHooksLoading ? 'Gerando...' : 'Gerar hooks'}
                </button>
              </div>
              <input
                value={carTema}
                onChange={e => { setCarTema(e.target.value); setCarHooks([]) }}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateCarousel()}
                placeholder={isPessoal ? 'Ex: a mania que herdei da minha mãe, achado da Shopee, domingo na feira...' : 'Ex: procrastinação, medo de ser demitido, perfeccionismo no trabalho...'}
                className="input text-sm w-full"
              />
              {carHooks.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-gray-400 font-medium mb-1">Clique para usar como tema do slide 1:</p>
                  {carHooks.map((hook, i) => (
                    <button
                      key={i}
                      onClick={() => { setCarTema(hook); setCarHooks([]) }}
                      className="w-full text-left text-xs text-gray-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 px-3 py-2 rounded-lg transition-colors leading-snug"
                    >
                      {hook}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ideia */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Ideia <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setCarGerarIdeia(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    carGerarIdeia ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} /> {carGerarIdeia ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!carGerarIdeia && (
                <textarea value={carIdeia} onChange={e => setCarIdeia(e.target.value)}
                  rows={2} placeholder="Um ângulo, situação ou entrada específica para o carrossel..."
                  className="input text-sm w-full resize-none" />
              )}
              {carGerarIdeia && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-600">
                  <Sparkles size={12} /> A IA vai criar uma ideia específica para o tema
                </div>
              )}
            </div>

            {/* Texto Base */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Texto base <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setCarGerarTexto(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    carGerarTexto ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} /> {carGerarTexto ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!carGerarTexto && (
                <textarea value={carTexto} onChange={e => setCarTexto(e.target.value)}
                  rows={3} placeholder="Cole um texto, rascunho ou ideia que queira transformar em carrossel..."
                  className="input text-sm w-full resize-none" />
              )}
              {carGerarTexto && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600">
                  <Sparkles size={12} /> A IA vai criar um texto base para o tema
                </div>
              )}
            </div>

            {carError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{carError}</div>
            )}

            <button onClick={generateCarousel} disabled={carLoading || !carTema.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl hover:from-orange-600 hover:to-rose-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-40 disabled:cursor-not-allowed">
              {carLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando carrossel...</> : <><LayoutGrid size={15} /> Gerar Carrossel</>}
            </button>
          </div>

          {/* ── Output do Carrossel ── */}
          {carResult && (
            <div className="space-y-3 animate-fade-in">

              {/* Abas de versão */}
              {(() => {
                const versions = [
                  { key: 'principal',   label: 'Principal',   data: carResult.versao_principal },
                  { key: 'emocional',   label: 'Emocional',   data: carResult.variacao_emocional },
                  { key: 'provocativa', label: 'Provocativa', data: carResult.variacao_provocativa },
                ]
                const active = versions.find(v => v.key === carActiveVersion) || versions[0]
                return (
                  <>
                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                      {versions.map(v => (
                        <button key={v.key} onClick={() => setCarActiveVersion(v.key)}
                          className={clsx('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                            carActiveVersion === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                          )}>
                          {v.label}
                        </button>
                      ))}
                    </div>

                    {/* Slides da versão ativa */}
                    {active.data && (
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 pt-3 pb-2">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Slides</span>
                          <button onClick={() => handleCarCopy(
                            (active.data.slides || []).map(s => `[${s.numero}] ${s.texto}`).join('\n\n'),
                            `slides-${active.key}`
                          )} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors">
                            {carCopied === `slides-${active.key}` ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar tudo</>}
                          </button>
                        </div>
                        <div className="px-4 pb-3 space-y-0">
                          {(active.data.slides || []).map((slide, idx) => (
                            <div key={slide.numero} className="relative flex gap-3 group py-2">
                              {/* linha conectora */}
                              {idx < (active.data.slides?.length ?? 0) - 1 && (
                                <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-100" />
                              )}
                              <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5 z-10">
                                <span className="text-[10px] font-bold text-orange-500">{slide.numero}</span>
                              </div>
                              <p className="flex-1 text-sm text-gray-800 leading-relaxed pt-0.5">{slide.texto}</p>
                              <button onClick={() => handleCarCopy(slide.texto, `slide-${active.key}-${slide.numero}`)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all shrink-0 mt-1">
                                {carCopied === `slide-${active.key}-${slide.numero}` ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Exercício Prático + Pergunta Final agrupados */}
              {(carResult.exercicio_pratico || (() => {
                const active = [
                  carResult.versao_principal,
                  carResult.variacao_emocional,
                  carResult.variacao_provocativa,
                ].find((_, i) => ['principal','emocional','provocativa'][i] === carActiveVersion) || carResult.versao_principal
                return active?.pergunta_final
              })()) && (
                <div className="rounded-2xl border border-orange-100 overflow-hidden bg-white">
                  {carResult.exercicio_pratico && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Target size={11} className="text-orange-500" />
                          <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Exercício Prático</span>
                        </div>
                        <button onClick={() => handleCarCopy(carResult.exercicio_pratico, 'car-exercicio')}
                          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors">
                          {carCopied === 'car-exercicio' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{carResult.exercicio_pratico}</p>
                    </div>
                  )}

                  {/* Pergunta Final — abaixo do exercício */}
                  {(() => {
                    const versions = { principal: carResult.versao_principal, emocional: carResult.variacao_emocional, provocativa: carResult.variacao_provocativa }
                    const pergunta = versions[carActiveVersion]?.pergunta_final || carResult.versao_principal?.pergunta_final
                    if (!pergunta) return null
                    return (
                      <div className="border-t border-orange-100 bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-white/70 uppercase flex items-center gap-1.5">
                            <Quote size={10} /> Pergunta Final
                          </span>
                          <button onClick={() => handleCarCopy(pergunta, `pergunta-${carActiveVersion}`)}
                            className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-all">
                            {carCopied === `pergunta-${carActiveVersion}` ? <Check size={10} /> : <Copy size={10} />}
                          </button>
                        </div>
                        <p className="text-sm font-bold text-white leading-snug">{pergunta}</p>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* CTA Fechado — só exibe se não repetir a pergunta final da versão ativa */}
              {carResult.cta_fechado && !isNearDuplicateText(
                carResult.cta_fechado,
                (carResult.versao_principal && carActiveVersion === 'principal' && carResult.versao_principal.pergunta_final)
                  || (carResult.variacao_emocional && carActiveVersion === 'emocional' && carResult.variacao_emocional.pergunta_final)
                  || (carResult.variacao_provocativa && carActiveVersion === 'provocativa' && carResult.variacao_provocativa.pergunta_final)
                  || carResult.versao_principal?.pergunta_final
              ) && (
                <div className="relative overflow-hidden rounded-2xl bg-gray-900 px-4 py-3 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-white/50 uppercase flex items-center gap-1.5">
                      <ToggleLeft size={10} /> CTA Fechado
                    </span>
                    <button onClick={() => handleCarCopy(carResult.cta_fechado, 'car-cta')}
                      className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-all">
                      {carCopied === 'car-cta' ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                  <p className="text-sm font-bold leading-snug">{carResult.cta_fechado}</p>
                </div>
              )}

              {/* Legenda + Comentários agrupados */}
              {(() => {
                const cleanLegenda = getCleanLegenda(carResult.legenda, carResult.exercicio_pratico)
                return (cleanLegenda || (carResult.comentarios || []).length > 0) && (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  {cleanLegenda && (
                    <div className="px-4 py-3 flex items-start justify-between gap-3 group">
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Legenda</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{cleanLegenda}</p>
                      </div>
                      <button onClick={() => handleCarCopy(cleanLegenda, 'car-legenda')}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all shrink-0 mt-5">
                        {carCopied === 'car-legenda' ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                  {(carResult.comentarios || []).length > 0 && (
                    <div className="px-4 py-3 space-y-2.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageCircle size={10} className="text-orange-400" /> Respostas sugeridas
                      </span>
                      {carResult.comentarios.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-xs text-gray-400 italic pl-1">"{item.comentario}"</p>
                          <div className="flex items-start gap-2 group/resp">
                            <div className="w-1 rounded-full bg-orange-200 self-stretch shrink-0 mt-0.5" />
                            <p className="flex-1 text-xs text-gray-700 leading-relaxed">{item.resposta}</p>
                            <button onClick={() => handleCarCopy(item.resposta, `comentario-${i}`)}
                              className="opacity-0 group-hover/resp:opacity-100 text-gray-300 hover:text-orange-500 transition-all shrink-0">
                              {carCopied === `comentario-${i}` ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )
              })()}

              {/* Validação — pills inline */}
              {carResult.validacao && (
                <div className="flex items-center gap-2 flex-wrap px-1">
                  <ShieldCheck size={11} className="text-gray-300 shrink-0" />
                  {[
                    { key: 'deixa_espaco',         label: 'Deixa espaço' },
                    { key: 'nao_parece_coach',      label: 'Não é coach' },
                    { key: 'so_karen_diria',        label: 'Só Karen diria' },
                    { key: 'perguntas_diferentes',  label: 'Perguntas distintas' },
                  ].map(({ key, label }) => {
                    const ok = carResult.validacao?.[key] === true
                    return (
                      <span key={key} className={clsx(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      )}>
                        {ok ? '✓' : '✗'} {label}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Salvar + Regenerar */}
              <div className="flex gap-2">
                <button
                  onClick={handleCarSaveHub}
                  disabled={carSavedHub}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border transition-all',
                    carSavedHub
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                  )}
                >
                  {carSavedHub
                    ? <><Check size={13} /> Salvo no Hub</>
                    : <><Save size={13} /> Salvar no Hub de Ideias</>
                  }
                </button>
                {carSavedHub && (
                  <button
                    onClick={() => navigate('/ideas')}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-200 rounded-xl transition-all"
                  >
                    <ExternalLink size={12} /> Abrir Hub
                  </button>
                )}
                <button
                  onClick={generateCarousel}
                  disabled={carLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={carLoading ? 'animate-spin' : ''} /> Regenerar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formulário de Stories ── */}
      {mode === 'stories' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
                <Film size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Protocolo de Stories</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isPessoal ? 'Observação real — a vida fora do trabalho, sem performar.' : 'Observação real — ponto de entrada da empreendedora, conexão com o corporativo.'}
                </p>
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                Tema <span className="text-red-400">*</span>
              </label>
              <input
                value={strTema}
                onChange={e => setStrTema(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateStories()}
                placeholder={isPessoal ? 'Ex: passeio com a Naomi, culto de domingo, achado que virou queridinho...' : 'Ex: ansiedade de domingo, reunião que podia ser e-mail, medo de pedir aumento...'}
                className="input text-sm w-full"
                autoFocus
              />
            </div>

            {/* Estrutura */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Estrutura <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES).map(([key, s]) => (
                  <button
                    key={key}
                    onClick={() => setStrEstrutura(key)}
                    className={clsx(
                      'text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all',
                      strEstrutura === key
                        ? 'bg-teal-50 border-teal-400 text-teal-800'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {strError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{strError}</div>
            )}

            <button onClick={generateStories} disabled={strLoading || !strTema.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-200 disabled:opacity-40 disabled:cursor-not-allowed">
              {strLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando roteiro...</> : <><Film size={15} /> Gerar Stories</>}
            </button>
          </div>

          {/* ── Output de Stories ── */}
          {strResult && (
            <div className="space-y-4 animate-fade-in">

              {/* Texto gerado */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">
                      Stories — {(isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES)[strEstrutura]?.label}
                    </span>
                  </div>
                  <button onClick={handleStrCopy}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-teal-600 transition-colors">
                    {strCopied ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                  </button>
                </div>
                <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {strResult}
                </div>
              </div>

              {/* Salvar + Regenerar */}
              <div className="flex gap-2">
                <button
                  onClick={handleStrSaveHub}
                  disabled={strSavedHub}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border transition-all',
                    strSavedHub
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                  )}
                >
                  {strSavedHub
                    ? <><Check size={13} /> Salvo no Hub</>
                    : <><Save size={13} /> Salvar no Hub de Ideias</>
                  }
                </button>
                {strSavedHub && (
                  <button
                    onClick={() => navigate('/ideas')}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:text-teal-600 hover:border-teal-200 rounded-xl transition-all"
                  >
                    <ExternalLink size={12} /> Abrir Hub
                  </button>
                )}
                <button
                  onClick={generateStories}
                  disabled={strLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={strLoading ? 'animate-spin' : ''} /> Regenerar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Input principal (Studio Livre) ── */}
      {mode === 'studio' && (<>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate() }}
          rows={3}
          placeholder="Descreva o que quer criar...

Ex: 'Reels sobre feminicídio, educativo e reflexivo'
Ex: 'POV de reunião corporativa, humor'
Ex: 'Dicas de IA para quem está começando na carreira'"
          className="w-full text-sm border-0 outline-none resize-none placeholder:text-gray-300 leading-relaxed"
        />

        {/* Brand Linter Panel */}
        {showLinter && input.trim() && (
          <BrandLinterPanel
            text={input}
            onClose={() => setShowLinter(false)}
            onFix={(oldText, newText) => setInput(prev => prev.replace(oldText, newText))}
          />
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Formato + Briefing */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowFormats(!showFormats)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                format ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              )}>
              {format ? FORMATS.find(f => f.id === format)?.label : 'Formato: Auto'} <ChevronDown size={12} />
            </button>
            {format && (
              <button onClick={() => setFormat(null)} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
            )}

            {/* Briefing upload */}
            <input type="file" ref={briefingRef} accept=".pdf,.txt,.md,.docx" className="hidden" onChange={handleBriefingUpload} />
            {briefing ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                <Paperclip size={12} />
                <span className="max-w-[120px] truncate">{briefingName}</span>
                <button onClick={() => { setBriefing(''); setBriefingName('') }} className="text-blue-400 hover:text-red-500"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => briefingRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 text-gray-500 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all">
                <Paperclip size={12} /> Anexar briefing
              </button>
            )}
          </div>

          {/* Gerar */}
          {(() => {
            const highSeverityViolations = brandViolations.filter(v => {
              const highPriority = [
                'not-x-but-y', 'ninguem-te-conta', 'a-verdade-e', 'voce-sente',
                'missao-vida', 'jornada-do',
              ]
              return highPriority.includes(v.id)
            })
            const isDisabled = loading || !input.trim() || highSeverityViolations.length > 0

            return (
              <button
                onClick={() => generate()}
                disabled={isDisabled}
                title={highSeverityViolations.length > 0 ? 'Reescreva para remover padrões críticos antes de gerar' : ''}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading && !adjusting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading && !adjusting ? 'Criando...' : 'Criar'}
              </button>
            )
          })()}
        </div>

        {/* Format selector dropdown */}
        {showFormats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button onClick={() => { setFormat(null); setShowFormats(false) }}
              className={clsx('p-2 rounded-lg border text-center text-[10px] font-medium transition-all',
                !format ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              )}>
              Auto-detectar
            </button>
            {FORMATS.map(f => {
              const Icon = f.icon
              return (
                <button key={f.id} onClick={() => { setFormat(f.id); setShowFormats(false) }}
                  className={clsx('flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all',
                    format === f.id ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}>
                  <Icon size={14} />
                  <span className="text-[10px] font-semibold">{f.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Links para ferramentas avançadas */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-300 uppercase font-semibold">Avançado:</span>
          <button onClick={() => navigate('/thoughts')} className="text-[10px] text-gray-400 hover:text-purple-500 flex items-center gap-1 transition-colors">
            <Brain size={10} /> Captura de Pensamento
          </button>
          <button onClick={() => navigate('/generate')} className="text-[10px] text-gray-400 hover:text-orange-500 flex items-center gap-1 transition-colors">
            <Wand2 size={10} /> Explorador de Ideias
          </button>
          <button onClick={() => navigate('/text')} className="text-[10px] text-gray-400 hover:text-emerald-500 flex items-center gap-1 transition-colors">
            <Layers size={10} /> Adaptador Multi-plataforma
          </button>
          <button onClick={() => navigate('/briefing')} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
            <Film size={10} /> Briefing Studio
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
        )}
      </div>

      {/* ── Resultado ── */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Context detection */}
          <div className="flex items-center gap-3 flex-wrap">
            {result.detected_context && (
              <span className={clsx('text-[10px] font-semibold px-2.5 py-1 rounded-md border',
                CONTEXT_COLORS[result.detected_context]?.bg,
                CONTEXT_COLORS[result.detected_context]?.text,
                CONTEXT_COLORS[result.detected_context]?.border,
              )}>
                Tom: {CONTEXT_COLORS[result.detected_context]?.label || result.detected_context}
              </span>
            )}
            {result.detected_context_reason && (
              <span className="text-[10px] text-gray-400 italic">{result.detected_context_reason}</span>
            )}
            {result.suggested_format && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                {FORMATS.find(f => f.id === result.suggested_format)?.label || result.suggested_format}
              </span>
            )}
          </div>

          {/* Título */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">{result.title}</h2>
            <div className="flex gap-1 shrink-0">
              <button onClick={handleFavorite} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Favoritar">
                <Heart size={14} />
              </button>
              <button onClick={handleSaveIdea} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors" title="Salvar como ideia">
                <Save size={14} />
              </button>
            </div>
          </div>

          {/* Títulos sugeridos */}
          {result.title_options?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Títulos Sugeridos (curtos e virais)</p>
              <div className="space-y-1.5">
                {result.title_options.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="text-xs font-bold text-orange-400">{i + 1}.</span>
                    <p className="flex-1 text-sm font-semibold text-gray-800">{t}</p>
                    <button onClick={() => handleCopy(t, `title-${i}`)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all">
                      {copied === `title-${i}` ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdo principal — selecione palavras para banir */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Conteúdo</span>
                <span className="text-[9px] text-gray-300">Selecione palavras no texto para banir</span>
              </div>
              <button onClick={() => handleCopy(result.content, 'content')}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-500 transition-colors">
                {copied === 'content' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
              </button>
            </div>
            <div
              className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed select-text"
              onMouseUp={() => {
                const sel = window.getSelection()
                const text = sel?.toString()?.trim()
                if (text && text.length >= 2 && text.length <= 50 && !text.includes('\n')) {
                  setBanCandidate(text)
                  const range = sel.getRangeAt(0)
                  const rect = range.getBoundingClientRect()
                  setBanPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 })
                }
              }}
            >
              {result.content}
            </div>
          </div>

          {/* Popup de banir palavra */}
          {banCandidate && (
            <div className="fixed z-50" style={{ left: banPosition.x - 80, top: banPosition.y - 36 }}>
              <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2 text-xs animate-fade-in">
                <button onClick={() => { addBannedWord(banCandidate); setBanCandidate(null); window.getSelection()?.removeAllRanges() }}
                  className="flex items-center gap-1 hover:text-red-400 transition-colors font-medium">
                  <X size={10} /> Banir "{banCandidate.length > 20 ? banCandidate.slice(0, 20) + '...' : banCandidate}"
                </button>
                <button onClick={() => { setBanCandidate(null); window.getSelection()?.removeAllRanges() }}
                  className="text-gray-400 hover:text-white">
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          {/* Palavras banidas */}
          {bannedWords.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-gray-300 uppercase font-semibold">Palavras banidas:</span>
              {bannedWords.map(w => (
                <span key={w} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                  {w}
                  <button onClick={() => removeBannedWord(w)} className="hover:text-red-800"><X size={9} /></button>
                </span>
              ))}
            </div>
          )}

          {/* Dica de filmmaker */}
          {result.filmmaker_tip && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Film size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-amber-700 uppercase mb-0.5">Dica de Filmmaker Mobile</p>
                <p className="text-xs text-amber-800">{result.filmmaker_tip}</p>
              </div>
            </div>
          )}

          {/* Legenda */}
          {result.caption && (
            <div className="bg-blue-50 rounded-xl border border-blue-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100">
                <span className="text-[10px] font-semibold text-blue-400 uppercase">Legenda</span>
                <button onClick={() => handleCopy(result.caption + '\n\n' + (result.hashtags || []).join(' '), 'caption')}
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-600 transition-colors">
                  {copied === 'caption' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                </button>
              </div>
              <div className="p-3 text-sm text-gray-700 whitespace-pre-wrap">{result.caption}</div>
            </div>
          )}

          {/* Hashtags */}
          {result.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.hashtags.map((tag, i) => (
                <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{tag}</span>
              ))}
            </div>
          )}

          {/* Ganchos alternativos */}
          {result.hook_alternatives?.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Ganchos Alternativos</p>
              <div className="space-y-1.5">
                {result.hook_alternatives.map((hook, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <span className="text-[10px] text-gray-300 mt-0.5">{i + 1}.</span>
                    <p className="text-xs text-gray-600 flex-1">{hook}</p>
                    <button onClick={() => handleCopy(hook, `hook-${i}`)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all">
                      {copied === `hook-${i}` ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Controles de iteração ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Iterar</p>

            {/* Regenerar + Dislike */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => generate({ regen: true })} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={loading && !adjusting ? 'animate-spin' : ''} /> Regenerar
              </button>
              <button onClick={handleDislike} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-lg transition-colors disabled:opacity-40">
                <ThumbsDown size={12} /> Não gostei
              </button>
              {history.length > 0 && (
                <button onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded-lg transition-colors">
                  <History size={12} /> Versões ({history.length})
                </button>
              )}
            </div>

            {/* Ajustar tom */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-300">Ajustar:</span>
              {ADJUSTMENTS.map(adj => {
                const Icon = adj.icon
                return (
                  <button key={adj.id} onClick={() => generate({ adjustment: adj.id })} disabled={loading}
                    className={clsx('flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all disabled:opacity-40',
                      adjusting === adj.id ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}>
                    <Icon size={10} /> {adj.label}
                    {adjusting === adj.id && <Loader2 size={10} className="animate-spin" />}
                  </button>
                )
              })}
            </div>

            {/* Adaptar para outro formato */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-300">Adaptar para:</span>
              {FORMATS.filter(f => f.id !== result.suggested_format).map(f => {
                const Icon = f.icon
                return (
                  <button key={f.id} onClick={() => handleAdapt(f.id)} disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all disabled:opacity-40">
                    <Icon size={10} /> {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Histórico de versões */}
          {showHistory && history.length > 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Versões Anteriores</p>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              {history.map((ver, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700">{ver.title}</p>
                    <div className="flex gap-1">
                      <button onClick={() => { setResult(ver); setShowHistory(false) }}
                        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">Restaurar</button>
                      <button onClick={() => handleCopy(ver.content, `hist-${i}`)}
                        className="text-gray-300 hover:text-gray-500">
                        {copied === `hist-${i}` ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-2">{ver.content?.slice(0, 150)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </>)} {/* fim mode === 'studio' */}

    </div>
  )
}
