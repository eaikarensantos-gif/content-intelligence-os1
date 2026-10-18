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
