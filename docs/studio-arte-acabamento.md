# Studio de Arte: projetos e acabamento

## Banco e versões

A biblioteca usa o Supabase já configurado no app, tabela existente `user_data`.
Não requer migração. Cada salvamento insere uma linha imutável, com chave
`studio-arte:v1:<email em hexadecimal>:<projeto UUID>:<versão UUID>`.
O email vem da sessão existente do LoginGate. Isso organiza a biblioteca por
conta, mas não substitui autenticação do servidor nem acrescenta isolamento RLS:
a implementação herda o modelo de acesso do banco conectado no aplicativo.
Não foi introduzida nenhuma chave de serviço no navegador.

Cada versão guarda a composição completa (textos, posições, fotos e estilos).
Uma cópia é gravada no IndexedDB. A UI só confirma salvamento no banco depois de
resposta de sucesso. Em falha remota mostra “somente neste navegador”. Salvar
novamente cria uma nova versão remota; versões locais anteriores não são enviadas
silenciosamente. A biblioteca une versões locais e remotas pelo identificador.
Restaurar abre uma cópia; salvar cria outra versão, sem substituir a antiga.

Os aparelhos devem usar o mesmo email e banco configurado. O banco geral do app
agora busca somente suas coleções conhecidas, evitando baixar todas as imagens
da biblioteca de arte durante a inicialização.

## Edição e exportação

- Guias em coordenadas reais da arte: margem de 64px, centros, bordas de elementos
  e espaços iguais entre vizinhos. Tolerância de encaixe: 12px. Checkbox desativa.
- Visão geral: arrastar ou usar setas, seleção múltipla, aplicação de fonte, cor do
  texto, fundo, assinatura e numeração. Um Desfazer reverte a aplicação em lote.
- Fundos em lote não removem fotografias. Textos, fotos e posições são preservados.
- Revisão mede o canvas real com as fontes carregadas. Aponta cortes, sobreposições,
  fonte abaixo de 28px e contraste de cores sólidas. Fotografias exigem conferência
  visual; não há promessa de validação automática de seu contraste.
- Alterar a arte invalida a revisão; apenas navegar entre cards não a invalida.
- PNG e ZIP são renderizados fora do editor, sem guias nem seleção. Os nomes
  `card-01.png`, etc. preservam a ordem original mesmo na exportação parcial.

## Verificação

`npm test -- src/components/arte src/store/useStore.sync.test.js`

Com Vite em execução: `node dev/scripts/arte-complete-smoke.mjs` valida versões
com Supabase simulado, abertura em segundo navegador, falha de rede com cópia
local, ajustes/desfazer, alinhamento, revisão e conteúdo/dimensões dos PNGs no ZIP
em 1280px e 390px. Esse teste não escreve no banco de produção.

## Grade do Instagram

Painel "Grade do Instagram" no Studio de Arte (`src/components/arte/grade/`). Simula o perfil com os
posts novos no topo (card 1 da arte em edição e artes salvas) e o feed atual embaixo.
Nada é publicado nem alterado no Instagram.

- Feed atual: `instagram-list-media` (30 posts). A cor de cada miniatura é lida num canvas; se a CDN não
  liberar CORS, a imagem vem pela ação `instagram-image` de `api/ai.js`, que só aceita https em
  `cdninstagram.com` e `fbcdn.net`, sem redirecionamento, até 3 MB.
- Posts novos: o card 1 é renderizado e lido do mesmo jeito. A fila (artes salvas, ordem e fixados) fica
  no IndexedDB, chave `grade:v1`. Story não entra, porque não aparece na grade.
- Nota de harmonia (`harmonia.js`): olha só os 12 primeiros posts. Cada imagem vira barulho (0 a 100: cor viva
  mais contraste interno), luz, matiz dominante e tipo (foto, ou arte/print quando uma cor chapada ocupa 30% ou mais).
  "Cor forte" é relativa ao feed: o terço mais forte, com piso 0,25 e teto 0,6. Pesa: cor forte encostada em cor
  forte, excesso de cor forte, luz sem alternância (três escuros ou três claros em sequência, dois escuros ou dois
  claros encostados), cor forte sem repetição, vizinhos de matizes a 90 graus ou mais e três fotos (ou três artes)
  em sequência. Sequências longas na mesma coluna viram uma mensagem só. O modo "Mostrar o que o Content leu"
  exibe barulho e tipo em cada tile. É régua editorial, não prevê alcance, e os limiares foram calibrados em
  feeds simulados, não em dados de desempenho.
- Sugestões (`analiseGrade.js`): ordem dos novos, até 3 fixados, troca de fundo dos novos (só modelos com
  texto direto sobre o fundo e sem foto) e uma ordem ideal que existe só na simulação. Só aparece sugestão
  que sobe a nota em pelo menos 3 pontos.
- Limites: o Instagram mostra por data, então reordenar o que já foi publicado só é possível com fixados
  (até 3) ou repostando. A API não informa quais posts já estão fixados. A proporção 3:4 do perfil é uma
  suposição configurável no seletor da tela.

Verificação: `npm test -- src/components/arte/grade src/lib/igMedia.test.js` e, com Vite em execução,
`node dev/scripts/arte-grade-smoke.mjs`.
