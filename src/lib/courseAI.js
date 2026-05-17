import { callAI } from './aiService'

function parseJSON(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  return JSON.parse(cleaned)
}

// Generates full course structure: array of modules each with lessons
export async function aiGenerateCourseStructure(aiSettings, { title, objectives, targetAudience }) {
  const messages = [
    {
      role: 'system',
      content: 'Você é um especialista em design instrucional e criação de cursos online. Responda APENAS com JSON válido, sem explicações ou markdown.',
    },
    {
      role: 'user',
      content: `Crie uma estrutura completa de módulos e aulas para o seguinte curso:

Título: "${title}"
Objetivos: "${objectives}"
Público-alvo: "${targetAudience}"

Retorne um array JSON com esta estrutura exata:
[
  {
    "title": "Módulo 1: Nome do Módulo",
    "description": "Descrição breve do módulo",
    "lessons": [
      {
        "title": "Nome da Aula",
        "summary": "O que o aluno vai aprender nesta aula",
        "type": "video"
      }
    ]
  }
]

Regras:
- Crie entre 4 e 6 módulos
- Cada módulo deve ter entre 3 e 5 aulas
- type: "video" | "live" | "quiz" | "pdf"
- A progressão deve ser lógica do básico ao avançado
- Retorne APENAS o array JSON`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.7, maxTokens: 3000 })
  return parseJSON(text)
}

// Generates a complete lesson script for recording
export async function aiGenerateLessonScript(aiSettings, { lessonTitle, courseTitle, moduleTitle, objectives }) {
  const messages = [
    {
      role: 'system',
      content: 'Você é um especialista em criação de roteiros didáticos para aulas online. Escreva em português do Brasil.',
    },
    {
      role: 'user',
      content: `Escreva um roteiro completo para gravação da seguinte aula:

Aula: "${lessonTitle}"
Módulo: "${moduleTitle || ''}"
Curso: "${courseTitle || ''}"
Objetivos gerais do curso: "${objectives || ''}"

O roteiro deve conter:
1. **Abertura** (30-60s) — cumprimento e contextualização
2. **Revisão** (30s) — conexão com a aula anterior (se aplicável)
3. **Desenvolvimento** — conteúdo principal dividido em seções claras com marcações de tempo estimado
4. **Exemplos práticos** — pelo menos 2 exemplos ou demonstrações
5. **Recapitulação** — resumo dos pontos principais
6. **Encerramento** — chamada para ação e prévia da próxima aula

Use o formato: **[SEÇÃO]** para cabeçalhos de seção e *[tempo estimado: X min]* para tempos. Seja conversacional e didático.`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.75, maxTokens: 2500 })
  return text.trim()
}

// Generates exercises for a lesson
export async function aiGenerateExercises(aiSettings, { lessonTitle, lessonContent, lessonSummary, type = 'quiz', count = 3 }) {
  const context = lessonContent || lessonSummary || lessonTitle

  const typeDescriptions = {
    quiz: 'perguntas de múltipla escolha com 4 alternativas (marque a correta)',
    practical: 'exercícios práticos que o aluno deve realizar',
    reflection: 'perguntas abertas de reflexão e análise crítica',
    project: 'mini-projetos aplicados ao tema da aula',
    case: 'estudos de caso para análise e discussão',
  }

  const messages = [
    {
      role: 'system',
      content: 'Você é um especialista em avaliação educacional. Responda APENAS com JSON válido, sem explicações ou markdown.',
    },
    {
      role: 'user',
      content: `Crie ${count} exercícios do tipo "${typeDescriptions[type] || type}" para a aula abaixo.

Aula: "${lessonTitle}"
Conteúdo/Resumo: "${context}"

Retorne um array JSON com esta estrutura:
[
  {
    "type": "${type}",
    "title": "Título do exercício",
    "content": "Enunciado completo do exercício. Para quiz, inclua as 4 alternativas marcando a correta com [CORRETA].",
    "difficulty": "básico | intermediário | avançado"
  }
]

Retorne APENAS o array JSON.`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.7, maxTokens: 2000 })
  return parseJSON(text)
}

// Processes a raw insight/note into structured course content
export async function aiProcessCourseInsight(aiSettings, { content, courseTitle }) {
  const messages = [
    {
      role: 'system',
      content: 'Você é um assistente de produção de conteúdo educacional. Responda APENAS com JSON válido.',
    },
    {
      role: 'user',
      content: `Transforme a seguinte ideia/nota bruta em conteúdo estruturado para o curso "${courseTitle || 'sem título'}":

Ideia: "${content}"

Retorne JSON com esta estrutura:
{
  "title": "Título sugerido para esta ideia",
  "type": "nova_aula | exercício | exemplo | curiosidade | atualização | módulo",
  "summary": "Resumo desenvolvido (2-3 parágrafos)",
  "actionItems": ["ação 1", "ação 2"],
  "suggestedPosition": "onde isso poderia se encaixar no curso"
}

Retorne APENAS o JSON.`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.7, maxTokens: 1000 })
  return parseJSON(text)
}

// Generates a standalone lesson (not linked to a course)
export async function aiGenerateStandaloneLesson(aiSettings, { topic, audience, objectives }) {
  const messages = [
    {
      role: 'system',
      content: 'Você é um especialista em criação de aulas didáticas. Responda APENAS com JSON válido, sem markdown.',
    },
    {
      role: 'user',
      content: `Gere uma aula completa sobre o seguinte tema:

Tema: "${topic}"
Público-alvo: "${audience || 'geral'}"
Objetivos: "${objectives || ''}"

Retorne JSON com esta estrutura:
{
  "title": "Título da aula",
  "summary": "Resumo do que o aluno vai aprender (2-3 frases)",
  "type": "video",
  "duration": "tempo estimado em minutos",
  "script": "Roteiro completo da aula com abertura, desenvolvimento e encerramento",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
  "exercises": [
    {
      "type": "quiz",
      "title": "Título",
      "content": "Enunciado completo"
    }
  ]
}

Retorne APENAS o JSON.`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.75, maxTokens: 3000 })
  return parseJSON(text)
}
