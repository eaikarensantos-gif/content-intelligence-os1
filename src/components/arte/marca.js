// Identidade visual @karensantosperfil: cores, fontes e regras que o Studio de Arte não deixa quebrar.
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

// Título é Bootzy ou Instrument; Inter é sempre corpo; a manuscrita é só detalhe.
export const FONTES_TITULO = {
  bootzy: { nome: 'Bootzy', css: "'KS Bootzy', 'Arial Black', sans-serif", tracking: '0.03em', estilo: 'normal' },
  instrument: { nome: 'Instrument Serif', css: "'KS Instrument', Georgia, serif", tracking: '-0.01em', estilo: 'italic' },
}
export const FONTE_CORPO = "'KS Inter', Arial, sans-serif"
export const FONTE_DETALHE = "'KS Kinder', 'Comic Neue', cursive"

export const FORMATOS = {
  feed: { nome: 'Feed 4:5', w: 1080, h: 1350 },
  story: { nome: 'Story 9:16', w: 1080, h: 1920 },
}

// Emojis Apple são os únicos adesivos da identidade.
export const EMOJIS = ['2728', '2b50', '1f440', '1f525', '1f914', '1f9d0', '1f4dd', '1f90d', '1f497', '1f338', '2615', '1f3a4']
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
  return a
}
