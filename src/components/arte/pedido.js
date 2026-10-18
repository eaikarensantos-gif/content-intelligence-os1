// Pedido em linguagem natural ("quero um carrossel de 3 slides sobre…") vira um projeto do Studio.
// A IA só escolhe entre o que a identidade permite; normalizar() descarta o que sair disso.
import { extractJsonObject } from '../../utils/aiJson.js'
import { CORES, EMOJIS, FONTES_TITULO, FORMATOS, normalizar } from './marca'
import { TEMPLATES } from './Templates'
import { CARTAO, CARTOES, CATEGORIAS } from './cartoes/colecao'
import { fotosDe, formatoDe, novoCartao } from './cartoes/render'

// Templates que mostram a foto; nos demais ela não aparece.
export const TOTAL_MODELOS = Object.keys(TEMPLATES).length + CARTOES.length

export const USAM_FOTO = ['tarjas', 'atrasCabeca', 'cabecaCaixa', 'caixa']

const GUIA_TEMPLATES = {
  tarjas: 'título em tarjas de cor sobre foto (ou fundo liso). Bom para capa e frase de opinião.',
  atrasCabeca: 'uma palavra gigante (até 8 letras) atrás da cabeça da pessoa na foto; texto curto em tarja embaixo. Só use com foto.',
  cabecaCaixa: 'bloco de cor em cima com título, foto embaixo, cabeça passando por cima do bloco; detalhe manuscrito no bloco. Só use com foto.',
  corCheia: 'frase grande sobre cor lisa, texto de apoio embaixo. Bom para slide de argumento.',
  caixa: 'cartão creme com borda tracejada, título e parágrafo; foto opcional embaixo. Bom para relato pessoal.',
  selecao: 'parágrafo de contexto no texto e uma frase no título, que aparece selecionada como no Android (*trecho* marca a seleção).',
  chat: 'conversa de chat: cada linha do texto é um balão; linhas que começam com ">" são dela, as outras são a resposta.',
  busca: 'barra de busca: 1ª linha do texto é o que foi digitado, as seguintes são sugestões. Título acima.',
}

export function instrucoes() {
  const cores = Object.entries(CORES).map(([k, c]) => `${k} (${c.nome}, ${c.hex})`).join(', ')
  const colecao = CARTOES.map((c) => `- ${c.id}: ${c.nome}; categoria: ${CATEGORIAS[c.categoria]}; formato: ${formatoDe(c)}; fotos: ${fotosDe(c).length}; título principal: ${c.titulo || 'nenhum'}; corpo: ${c.texto || 'nenhum'}; campos: ${JSON.stringify(c.campos.map(({ id, rotulo, padrao, ajuda }) => ({ id, rotulo, espacoDeReferencia: padrao, ...(ajuda && { ajuda }) })))}`).join('\n')
  const templates = Object.entries(GUIA_TEMPLATES).map(([k, t]) => `- ${k}: ${t}`).join('\n')
  return `Você monta artes de Instagram para Karen Santos (@karensantosperfil) dentro de uma identidade visual fechada.
Responda SOMENTE com JSON válido, sem markdown.

Formato da resposta:
{"formato":"feed"|"story","contador":true|false,"slides":[{"template":"…","titulo":"…","texto":"…","detalhe":"…","fundo":"…","corTitulo":"…","corTexto":"…","corDestaque":"…","corTarja":"…","fonteTitulo":"bootzy"|"instrument","usarFoto":true|false,"emojis":["código"]}]}

Catálogo completo: ${TOTAL_MODELOS} modelos. Escolha pelo conteúdo, não apenas os oito modelos base.

Modelos base (use o formato de slide acima):
${templates}

Coleção de arte (use este formato de slide):
{"template":"cartao","cartao":"ID_EXATO","textos":{"ID_DO_CAMPO":"texto para esse campo"},"usarFoto":true|false}
${colecao}

Regras da coleção:
- Escolha cartao pelo ID exato e preencha textos usando SOMENTE os IDs de campos daquele modelo. Campos sem uso recebem "".
- espacoDeReferencia mostra a distribuição e a extensão aproximada do texto original. NÃO copie os exemplos; escreva sobre o pedido da pessoa.
- Respeite a função de cada campo: uma etiqueta, assinatura ou palavra gigante não comporta um parágrafo. Use quebras de linha para legibilidade, sem amontoar texto.
- Cada modelo conserva sua composição, fontes, cores, emojis e fotos originais. Não envie HTML, URLs ou ajustes de camada.
- usarFoto true aplica a foto fornecida pela pessoa nos espaços de foto. Sem foto fornecida, os modelos da coleção usam as fotos de referência da própria galeria; não prometa uma foto nova.
- As dimensões da coleção são fixas: use modelos feed para feed e story para story.
- Para slides já escritos, selecione um modelo cujo título principal e corpo comportem os textos originais. Nunca corte ou reescreva conteúdo para caber.
- Varie entre as famílias da coleção conforme a função do slide, mantendo coerência visual; não repita um único modelo por padrão.
- Alterne composições fotográficas, recortes, colagens, balões e tipografia quando o conteúdo e formato comportarem. Não limite o carrossel a cartões de texto. Sem foto fornecida, pode sugerir as fotos de referência dos modelos da coleção, que a pessoa poderá substituir. Preserve pedidos explícitos de arte sem foto.

Cores permitidas (use a chave): ${cores}.
Fontes do título: bootzy (padrão, títulos curtos e fortes) ou instrument (serifa itálica, editorial).
Emojis permitidos (códigos Apple, no máximo 2 por slide, opcionais): ${EMOJIS.join(', ')}.

Regras:
- Quando ela ditar o texto, use as palavras dela, só dividindo entre título, texto e detalhe. Corrija apenas pontuação e erros de transcrição.
- Quando ela só der o assunto, escreva curto, em minúsculas no título, oral e direto. Sem "não é X, é Y", sem travessão dramático, sem pergunta de engajamento no fim.
- Use *asteriscos* em no máximo um trecho por slide para a cor de destaque.
- Título com até ~45 caracteres. "detalhe" é uma anotação manuscrita curta e opcional ("" se não fizer sentido).
- Contraste: texto claro (creme, areia, pessego, mostarda) sobre fundo escuro (cafe, tinta, terracota) e vice-versa.
- Informe também "papel" em cada slide: "capa", "explicacao", "conversa", "lista" ou "fechamento". A escolha visual será conferida pelo editor.
- Em carrossel, mantenha a mesma família de cores e varie o template quando o conteúdo pedir.
- usarFoto só é true se ela pediu foto; atrasCabeca e cabecaCaixa exigem foto.
- formato "feed" por padrão; "story" só se ela pedir. contador true em carrossel com 3 ou mais slides, salvo pedido contrário.`
}

/** Converte a resposta da IA num projeto do Studio. Pura: dá para testar sem rede. */
export function montarProjeto(resposta, foto = '') {
  const slidesIA = Array.isArray(resposta?.slides) ? resposta.slides.slice(0, 12) : []
  if (!slidesIA.length) throw new Error('A IA não devolveu nenhum slide. Tente descrever de outro jeito.')
  const slides = slidesIA.map((s) => {
    if (s?.template === 'cartao') {
      const def = CARTAO[s.cartao]
      if (!def) throw new Error('A IA escolheu um modelo de arte que não existe. Tente gerar novamente.')
      // Nunca deixe textos de exemplo reaparecerem quando a IA omite um campo.
      const textos = Object.fromEntries(def.campos.map((c) => [c.id, typeof s.textos?.[c.id] === 'string' ? s.textos[c.id] : '']))
      const fotos = foto && s.usarFoto ? Object.fromEntries(fotosDe(def).map((slot) => [slot, foto])) : {}
      if (def.cabeca && fotos[def.cabeca.slot]) fotos[`${def.cabeca.slot}:recorte`] = ''
      return novoCartao(def.id, { textos, fotos })
    }
    let template = s?.template in TEMPLATES ? s.template : 'corCheia'
    const comFoto = !!foto && (s?.usarFoto || TEMPLATES[template].recorta) && USAM_FOTO.includes(template)
    // Sem foto, os modelos de cabeça não funcionam: caem para o mais próximo.
    if (TEMPLATES[template].recorta && !foto) template = template === 'atrasCabeca' ? 'tarjas' : 'corCheia'
    const padrao = { ...TEMPLATES[template].padrao, template }
    const campos = {}
    for (const k of ['titulo', 'texto', 'detalhe']) if (typeof s?.[k] === 'string') campos[k] = s[k]
    for (const k of ['fundo', 'corTitulo', 'corTexto', 'corDestaque', 'corTarja']) if (s?.[k] in CORES) campos[k] = s[k]
    if (s?.fonteTitulo in FONTES_TITULO) campos.fonteTitulo = s.fonteTitulo
    // Emojis: aproveita as posições do template; um segundo vai para o canto oposto.
    const cods = (Array.isArray(s?.emojis) ? s.emojis : []).filter((c) => EMOJIS.includes(c)).slice(0, 2)
    const lugar = padrao.emojis[0] ?? { x: 880, y: 90, tam: 100 }
    campos.emojis = cods.map((cod, i) => (i === 0 ? { ...lugar, cod } : { cod, x: 1080 - lugar.x - lugar.tam, y: Math.max(60, 1350 - lugar.y - lugar.tam - 120), tam: lugar.tam }))
    if (comFoto) Object.assign(campos, { foto, veu: padrao.veu || 0.3 })
    return normalizar(campos, padrao)
  })
  return {
    formato: resposta.formato in FORMATOS ? resposta.formato : 'feed',
    contador: typeof resposta.contador === 'boolean' ? resposta.contador : slides.length >= 3,
    atual: 0,
    slides,
  }
}

// ── Entrada vinda dos geradores do Content (ex.: Carrossel Studio) ──────────
const CHAVE_ENTRADA = 'studio-arte:entrada'

/** Guarda os slides de um gerador para o Studio de Arte montar ao abrir. slides: [{titulo, texto, papel, visual}] */
export function guardarEntrada(origem, slides) {
  try {
    localStorage.setItem(CHAVE_ENTRADA, JSON.stringify({ origem, slides, em: Date.now() }))
  } catch { /* sem armazenamento: o Studio abre vazio */ }
}

/** Lê e apaga a entrada pendente (vale por 10 minutos, para não reaparecer dias depois). */
export function pegarEntrada() {
  try {
    const bruto = localStorage.getItem(CHAVE_ENTRADA)
    localStorage.removeItem(CHAVE_ENTRADA)
    const e = JSON.parse(bruto ?? 'null')
    if (!e?.slides?.length || Date.now() - (e.em ?? 0) > 10 * 60 * 1000) return null
    return e
  } catch {
    return null
  }
}

/** Pedido para a IA só diagramar: os textos já estão prontos. */
export function pedidoDeSlides(slides) {
  const lista = slides.map((s, i) => [
    `Slide ${i + 1}${s.papel ? ` (${s.papel})` : ''}:`,
    `titulo: ${s.titulo || ''}`,
    `texto: ${s.texto || ''}`,
    s.visual ? `sugestão visual do gerador: ${s.visual}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')
  return `Diagrame este carrossel já escrito. Gere exatamente ${slides.length} slides, na mesma ordem.
Copie título e texto de cada slide sem mudar nenhuma palavra; você só pode marcar um trecho com *asteriscos*.
Escolha template, cores e emojis pelo papel de cada slide e pela sugestão visual. Capa forte, miolo legível, último slide fechando.
Considere todos os ${TOTAL_MODELOS} modelos do catálogo. Na coleção, copie o título no campo indicado como título principal e o texto no campo indicado como corpo. Se houver texto de corpo, não escolha modelo sem campo de corpo distinto do título. Deixe os demais campos vazios. Use chat ou busca só se o texto já vier com uma linha por mensagem ou sugestão. Escolha um layout com espaço suficiente; não use etiquetas ou palavras gigantes para parágrafos.

${lista}`
}

const semDestaque = (t = '') => t.replace(/\*/g, '').replace(/\s+/g, ' ').trim()

/** Garante o texto do gerador: se a IA mudou uma palavra, volta o original (aceita só os asteriscos). */
export function fixarTextos(resposta, slides) {
  const saida = slides.map((orig, i) => {
    let s = resposta?.slides?.[i] ?? { template: 'corCheia' }
    if (s.template === 'cartao') {
      const def = CARTAO[s.cartao]
      if (def?.titulo && (!orig.texto || (def.texto && def.texto !== def.titulo))) {
        const textos = Object.fromEntries(def.campos.map((c) => [c.id, '']))
        const fielCampo = (campo, original = '') => typeof s.textos?.[campo] === 'string' && semDestaque(s.textos[campo]) === semDestaque(original) ? s.textos[campo] : original
        textos[def.titulo] = fielCampo(def.titulo, orig.titulo)
        if (def.texto && def.texto !== def.titulo) textos[def.texto] = fielCampo(def.texto, orig.texto)
        return { ...s, textos, papel: orig.papel }
      }
      // Um modelo sem campo de corpo não pode descartar o parágrafo do gerador.
      s = { template: 'corCheia' }
    }
    const fiel = (k) => (semDestaque(s[k]) === semDestaque(orig[k]) ? s[k] : orig[k] || '')
    return { ...s, titulo: fiel('titulo'), texto: fiel('texto'), ...(orig.papel && { papel: orig.papel }) }
  })
  return { ...resposta, slides: saida }
}

export async function pedirArte(pedido) {
  const res = await fetch('/api/ai?action=openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': localStorage.getItem('cio-openai-key') || '' },
    body: JSON.stringify({
      model: 'gpt-5.6-terra',
      thinking: { type: 'adaptive' },
      max_tokens: 8000,
      system: instrucoes(),
      messages: [{ role: 'user', content: pedido }],
    }),
  })
  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }
  const data = await res.json()
  const raw = data.content?.find((b) => b.type === 'text')?.text
  return extractJsonObject(raw, 'A IA respondeu num formato que não deu para ler. Tente de novo.')
}
