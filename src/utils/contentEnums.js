// Enumerações compartilhadas entre o formulário de Nova Ideia e o Posicionamento
// — o pilar guarda formato_preferido/gancho_tipico usando os MESMOS valores
// que o formulário aceita, pra pré-preencher sem precisar de match de texto livre.

export const FORMATS = ['carrossel', 'thread', 'video', 'reel', 'artigo', 'story', 'podcast']
export const FORMAT_LABELS = { carrossel: 'Carrossel', thread: 'Thread', video: 'Vídeo', reel: 'Reel', artigo: 'Artigo', story: 'Story', podcast: 'Podcast' }

export const HOOK_TYPES = ['lista', 'contrario', 'historia', 'dados', 'problema', 'pergunta', 'como-fazer', 'novidade']
export const HOOK_LABELS = { lista: 'Lista', contrario: 'Contrário', historia: 'História', dados: 'Dados', problema: 'Problema', pergunta: 'Pergunta', 'como-fazer': 'Como Fazer', novidade: 'Novidade' }
