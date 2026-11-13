---
name: edicao-estilo-amber
description: Edita vídeo bruto da Karen Santos em Reels 1080×1920 no estilo limpo da Amber Sharniece (legenda de uma palavra, duas fontes, etiqueta serif no topo, pílulas, cartão de cor sólida, mockup de celular). Corta pausas, transcreve palavra a palavra, planeja cena a cena, monta e renderiza. Use quando Karen mandar um vídeo ou pasta de vídeos e pedir "edita igual a Amber", "estilo Amber", "legenda de uma palavra", "edição minimalista", ou citar um arquivo como IMG_2547. Para o estilo do DS da Karen (paleta outono, tarjas, papel colado), use a skill edicao-reels.
---

# Edição no estilo Amber

Origem: análise de 6 reels da @ambersharniece (o da Walmart/TCL é publi), mais o método do vídeo do Joseph (Ultimate Editors): ensinar o estilo antes de automatizar. Tudo abaixo vem de frames amostrados a cada 4s e de detecção de corte. Não houve transcrição nem medição de tempo de animação. O que é medido está marcado como medido, o resto é leitura visual.

## Antes de começar

1. Ler `.claude/sistema-de-conteudo.md` (gates da seção 5 e voz da seção 6 valem pra qualquer texto que a Karen não tenha falado).
2. Localizar o vídeo. Esta skill foi escrita pra uma sessão com acesso ao computador da Karen: procurar na pasta `videos`. Nunca sobrescrever o original, gravar em `videos/saida/`.
3. Checar o ambiente e dizer o que falta antes de prometer resultado:
   - `ffmpeg` e `ffprobe` (obrigatório)
   - `python3` com `faster-whisper` ou `whisper` (transcrição palavra a palavra)
   - fontes: Inter (sans) e uma serif itálica (ver Fontes)
   - Remotion (opcional, só pra animação mais elaborada)
4. Sem transcrição, pedir a fala em texto à Karen. Sem ela, só dá pra cortar pausa, enquadrar, título fixo e áudio. Não inventar legenda.
5. Perguntar o assunto do vídeo se não vier no pedido. Sem isso o plano de cenas não fecha.

## O estilo

**Legenda principal.** Uma palavra por vez, sans bold, minúscula, branca, centralizada na horizontal. Posição medida em 720×1280: altura de 71% da tela (y≈915). Palavra de ênfase pode trocar pra serif itálica.

**Etiqueta de contexto.** Fica no topo, acima do assunto. Linha pequena em sans medium ("my A-roll camera") e, logo abaixo, o nome em serif itálica creme ("Sony a7C II"). Medido: linha pequena em 9% da altura, nome em 14%.

**Pílula.** Cápsula arredondada, preta ou creme, com texto sans bold curto ("on my page", "not a wish list", "cam 1"). Medido: 24% da altura quando acompanha uma etiqueta.

**Título de abertura.** Duas camadas: frase curta em sans regular e a frase de impacto em sans ExtraBold com tracking negativo, uma palavra em serif itálica ("*then* get in your bag"). Fica fixo no topo nos reels curtos.

**Cartão de uma palavra.** Tela de cor sólida (rosa no exemplo) com uma palavra em sans bold, usado como respiro entre trechos de fala.

**Mockup de celular.** Celular em fundo off-white com grade fina, tela real dentro (editor de vídeo, site, app). Aparece em três dos seis vídeos. É o formato mais próximo da tela de Android do DS da Karen.

**Split-screen.** Linha vertical branca dividindo duas câmeras, com pílulas "cam 1" e "cam 2".

**Checklist.** Cartão off-white com itens e caixinhas, um item marcado por vez.

**Callout numérico.** Número curto com seta sobre a pessoa ("-43LBS"), pra um dado que a fala cita.

**Notificação.** Cartão branco pequeno no topo com horário, no estilo alerta de celular, em vlog.

### Fontes (identificadas por leitura visual, confirmar)

| Uso | Candidata | Confiança |
|---|---|---|
| Sans de títulos e legenda | Inter ou Inter Tight, Bold a ExtraBold | média a alta |
| Serif itálica de etiqueta | Instrument Serif Itálico (Playfair Itálico é alternativa) | média |
| Serif de título da publi | Didone itálico (Playfair ou Bodoni Moda) | baixa |
| Manuscrita amarela da publi | não identificada | baixa |

O DS da Karen já tem Inter e Instrument. Antes de renderizar, comparar um frame de referência com a mesma frase nas duas serifs e escolher pela que parece mais próxima. Cores em hex não foram medidas: o creme das etiquetas é amarelado e deve ser amostrado de um frame.

## Regras de edição

Lidas do cartão "the edit rules" do vídeo "it's the edit" da Amber:

1. Cortar toda pausa.
2. Acelerar até 1.1x (valor lido num frame, conferir no áudio antes de tratar como regra).
3. Punch in e punch out: alternar enquadramento no mesmo take pra esconder o corte.
4. Legenda de uma palavra.
5. Não repetir B-roll.
6. Múltiplos ângulos quando houver.
7. Música baixa por baixo da fala.

Ritmo de referência: 11 a 13 cortes por minuto nos reels de talking head, 27 num vídeo de produto, 48 num vlog. Contagem aproximada, a detecção perde corte suave.

## Pipeline

1. **Inspecionar.** `ffprobe` pra resolução, fps, duração, áudio. Referências da Amber estão em 720×1280 (24 ou 30 fps). Saída em 1080×1920, 30 fps, H.264, AAC. Multiplicar medidas de 720 por 1,5.
2. **Transcrever.** Palavra a palavra com timestamps em milissegundos. Salvar em `videos/saida/<nome>.words.json`.
3. **Cortar silêncios.** Pontos de partida pra ajustar no ouvido: limiar de -35 dB, pausa mínima de 0,25s, margem de 30 ms em cada ponta (margem do método do Joseph). Gerar a lista de cortes e conferir o resultado com a Karen antes de continuar se algum corte pegar respiração dentro de frase.
4. **Plano cena a cena.** Tabela com tempo, fala, elemento (legenda, etiqueta, pílula, cartão, mockup, callout) e motivo. Mandar à Karen e esperar aprovação antes de montar. Esta é a etapa que o Joseph considera a mais importante, e cada cena precisa ter função, senão vira enfeite.
5. **Montar.** Legenda de uma palavra como arquivo ASS pelo `libass` do ffmpeg. Etiquetas, pílulas, cartões e mockups como PNG com transparência gerados em Python (Pillow), entrando por `overlay` com `enable='between(t,a,b)'`. Remotion só se a Karen pedir animação além de entrada e saída simples.
6. **Áudio.** `loudnorm` com I=-14, TP=-1.5. Música só de fonte licenciada e com a Karen aprovando a faixa. Não extrair áudio de vídeo de terceiros.
7. **Capa.** Um frame com etiqueta e título, exportado em PNG 1080×1920.
8. **Revisar.** Gerar uma folha de contato (1 frame a cada 2s) do resultado, olhar, listar o que está fora do padrão e corrigir antes de entregar. Entregar com o tempo gasto em cada etapa.

## Limites que ficaram abertos

- Duração, entrada, saída e easing das animações da Amber não foram medidos. Começar com entrada e saída curtas (cerca de 150 a 250 ms, valor de partida, não medido) e ajustar comparando com os vídeos de referência.
- O padrão tem 6 amostras de um único perfil. Split-screen e checklist têm 1 amostra cada.
- Fontes e cores precisam de confirmação (ver acima).
- O vídeo 3 da Amber é publi e usa trecho de série de TV. Não reproduzir.
- Tempos do Joseph (cerca de 1h55 por clipe) vêm de um clipe de podcast dele. O da Karen pode variar, medir no primeiro vídeo.

## Regras que valem sempre

- Texto na tela que não é fala da Karen (etiquetas, cartões, checklist) segue a voz do sistema: sem travessão dramático, sem "não é X, é Y", sem "mindset", "propósito", "transformação", fechamento seco. Números da Karen que ela não mandou ficam como `[SEU NÚMERO]`.
- Post que mostra ou cita outra IA que não seja o Gemini sai sem as hashtags do Engage (seção 11 do sistema). Editar com o Claude por trás não dispara isso, a menos que apareça na tela ou na legenda.
- Cópia de arte, enquadramento ou áudio de terceiros fica de fora. Do estilo se leva regra (posição, peso, ritmo), não material.
