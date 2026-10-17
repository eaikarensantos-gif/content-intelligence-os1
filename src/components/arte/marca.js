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
export const emojiUrl = (cod) => `/marca/emoji/${cod}.png`

export const hex = (cor) => CORES[cor]?.hex ?? cor

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
