// Identidade visual @karensantosperfil: paleta e sugestões iniciais do Studio de Arte.
// Fonte única de verdade para os templates; o Design System completo está no artifact "Karen Santos · Instagram".

export const CORES = {
  creme: { nome: 'Creme', hex: '#F4EFE7' },
  areia: { nome: 'Areia', hex: '#F1DFC4' },
  pessego: { nome: 'Pêssego', hex: '#F4C3A1' },
  mostarda: { nome: 'Mostarda', hex: '#E9C46A' },
  terracota: { nome: 'Terracota', hex: '#A64B2A' },
  cafe: { nome: 'Café', hex: '#5C3B2B' },
  tinta: { nome: 'Tinta', hex: '#2B211B' },
}

// Fontes iniciais: título em Bootzy ou Instrument, corpo em Inter e detalhe manuscrito.
export const FONTES_TITULO = {
  bootzy: { nome: 'Bootzy', css: "'KS Bootzy', 'Arial Black', sans-serif", tracking: '0.03em', estilo: 'normal' },
  instrument: { nome: 'Instrument Serif', css: "'KS Instrument', Georgia, serif", tracking: '-0.01em', estilo: 'italic' },
}
export const FONTE_CORPO = "'KS Inter', Arial, sans-serif"
export const FONTE_DETALHE = "'KS Kinder', 'Comic Neue', cursive"

// As fontes da marca são sugestões; cada bloco pode usar uma fonte diferente.
export const FONTES = {
  ...FONTES_TITULO,
  inter: { nome: 'Inter', css: FONTE_CORPO, estilo: 'normal', tracking: '-0.01em' },
  kinder: { nome: 'Kindergarten', css: FONTE_DETALHE, estilo: 'normal', tracking: 'normal' },
  arial: { nome: 'Arial', css: 'Arial, sans-serif', estilo: 'normal', tracking: 'normal' },
  georgia: { nome: 'Georgia', css: 'Georgia, serif', estilo: 'normal', tracking: 'normal' },
  times: { nome: 'Times New Roman', css: "'Times New Roman', serif", estilo: 'normal', tracking: 'normal' },
  courier: { nome: 'Courier New', css: "'Courier New', monospace", estilo: 'normal', tracking: 'normal' },
}

export const fonteDoBloco = (a, id, padrao) => FONTES[a.est?.[id]?.fonte] ?? FONTES[padrao]

export const corteFoto = (a, recorte = 0) => {
  const c = a.fotoCorte ?? {}
  return `inset(max(${recorte}px, ${c.topo ?? 0}%) ${c.direita ?? 0}% ${c.base ?? 0}% ${c.esquerda ?? 0}%)`
}

export const FORMATOS = {
  feed: { nome: 'Feed 4:5', w: 1080, h: 1350 },
  story: { nome: 'Story 9:16', w: 1080, h: 1920 },
}

// Emojis Apple são os únicos adesivos da identidade.
export const EMOJIS = [
  '2728', '2b50', '1f31f', '1f4ab', '1f440', '1f525', '1f914', '1f9d0', '1f60d', '1f970', '1f60e', '1faf6',
  '1f90d', '1f497', '1f496', '1f495', '1f9e1', '2764', '1f338', '1f352', '1f48e', '2705', '2615', '1f3a4',
  '1f4dd', '1f4d6', '1f4da', '1f4c5', '1f4ca', '1f4cc', '1f4cd', '1f4c1', '1f4c2', '1f4bb', '1f4f1', '1f4de',
  '1f4ac', '1f4e2', '1f4e7', '1f4f0', '1f517', '1f9e0', '1f916', '1f9f8', '1f9fe', '1f455', '2696-fe0f',
]
// Nomes para leitor de tela e dica ao passar o mouse.
export const EMOJI_NOMES = {
  '2728': 'faíscas', '2b50': 'estrela', '1f31f': 'estrela brilhante', '1f4ab': 'estrela girando', '1f440': 'olhos', '1f525': 'fogo',
  '1f914': 'rosto pensativo', '1f9d0': 'rosto com monóculo', '1f60d': 'olhos de coração', '1f970': 'rosto com corações', '1f60e': 'óculos escuros', '1faf6': 'mãos de coração',
  '1f90d': 'coração branco', '1f497': 'coração crescendo', '1f496': 'coração brilhante', '1f495': 'dois corações', '1f9e1': 'coração laranja', '2764': 'coração vermelho',
  '1f338': 'flor de cerejeira', '1f352': 'cerejas', '1f48e': 'gema', '2705': 'marca de verificação', '2615': 'café', '1f3a4': 'microfone',
  '1f4dd': 'bloco de notas', '1f4d6': 'livro aberto', '1f4da': 'livros', '1f4c5': 'calendário', '1f4ca': 'gráfico de barras', '1f4cc': 'alfinete',
  '1f4cd': 'alfinete de mapa', '1f4c1': 'pasta', '1f4c2': 'pasta aberta', '1f4bb': 'notebook', '1f4f1': 'celular', '1f4de': 'telefone',
  '1f4ac': 'balão de fala', '1f4e2': 'megafone', '1f4e7': 'e-mail', '1f4f0': 'jornal', '1f517': 'link', '1f9e0': 'cérebro',
  '1f916': 'robô', '1f9f8': 'urso de pelúcia', '1f9fe': 'recibo', '1f455': 'camiseta', '2696-fe0f': 'balança',
}
export const emojiUrl = (cod) => `/marca/emoji/${cod}.png`

export const hex = (cor) => CORES[cor]?.hex ?? cor

/** "1 card", "2 cards". */
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

/** Corta "*trecho*" em partes para a cor de destaque. */
export const partesDestaque = (texto = '') =>
  texto.split('*').map((t, i) => ({ t, destaque: i % 2 === 1 })).filter((p) => p.t)

/** Completa uma arte com os padrões do template e descarta o que a identidade não aceita. */
export const normalizar = (arte, padrao) => {
  const a = { ...padrao, ...arte, pos: { ...padrao.pos, ...(arte?.pos ?? {}) } }
  for (const campo of ['fundo', 'corTitulo', 'corTexto', 'corDestaque', 'corTarja']) {
    if (!(a[campo] in CORES)) a[campo] = padrao[campo]
  }
  if (!(a.fonteTitulo in FONTES_TITULO)) a.fonteTitulo = padrao.fonteTitulo
  if (!(a.formato in FORMATOS)) a.formato = 'feed'
  a.emojis = (a.emojis ?? []).filter((e) => EMOJIS.includes(e.cod))
  a.veu = Math.min(0.6, Math.max(0, Number(a.veu) || 0))
  a.est = { ...(padrao.est ?? {}), ...(arte?.est ?? {}) }
  return a
}
