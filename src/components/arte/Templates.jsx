import { FONTE_CORPO, fonteDoBloco, corteFoto, hex, partesDestaque, emojiUrl } from './marca'

// Cada template desenha a arte em tamanho real (1080 de largura). Os blocos de texto ficam dentro de
// <Bloco id>, que o canvas posiciona por arte.pos[id], deixa arrastar e redimensionar. Tamanho e
// alinhamento de cada bloco vêm de arte.est[id], com o padrão do template como reserva.
// Sem sombra em nenhum lugar.

const Rico = ({ texto, cor, fundo }) =>
  partesDestaque(texto).map((p, i) =>
    p.destaque ? (
      <span key={i} style={{ color: cor, background: fundo, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{p.t}</span>
    ) : (
      <span key={i}>{p.t}</span>
    ),
  )

const estiloFonte = (a, id, padrao) => {
  const f = fonteDoBloco(a, id, padrao)
  return { fontFamily: f.css, fontStyle: f.estilo, letterSpacing: f.tracking }
}

/** Tamanho e alinhamento do bloco: o que a pessoa ajustou ou o padrão do template. */
export const tam = (a, id, padrao) => a.est?.[id]?.tamanho ?? padrao
export const alin = (a, id, padrao = 'left') => a.est?.[id]?.alinhar ?? padrao

const estiloTitulo = (a, padrao) => {
  const f = fonteDoBloco(a, 'titulo', a.fonteTitulo)
  return { fontFamily: f.css, fontStyle: f.estilo, letterSpacing: f.tracking, fontSize: tam(a, 'titulo', padrao), lineHeight: 1.02, color: hex(a.corTitulo), whiteSpace: 'pre-wrap' }
}
const estiloCorpo = (a, padrao = 40) => ({ ...estiloFonte(a, 'texto', 'inter'), fontWeight: 500, fontSize: tam(a, 'texto', padrao), lineHeight: 1.32, letterSpacing: '-0.01em', color: hex(a.corTexto), whiteSpace: 'pre-wrap' })

/** Foto com enquadramento. A mesma camada desenha o recorte da pessoa, então os dois ficam sempre alinhados. */
export const Camada = ({ a, src, recorte = 0 }) =>
  src ? (
    <div data-foto="" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', clipPath: corteFoto(a, recorte) }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${src})`, backgroundSize: `${a.fotoZoom}%`, backgroundPosition: `${a.fotoX}% ${a.fotoY}%`, backgroundRepeat: 'no-repeat', transform: `translate(${a.fotoDX ?? 0}px, ${a.fotoDY ?? 0}px)` }} />
    </div>
  ) : null

/** Véu chapado sobre a foto (nunca degradê). */
const Veu = ({ a, recorte = 0 }) =>
  a.foto && a.veu > 0 ? <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: hex('tinta'), opacity: a.veu, clipPath: corteFoto(a, recorte) }} /> : null

const Detalhe = ({ a, Bloco }) =>
  a.detalhe ? (
    <Bloco id="detalhe" largura={460}>
      <div style={{ ...estiloFonte(a, 'detalhe', 'kinder'), fontSize: tam(a, 'detalhe', 46), lineHeight: 1.15, color: hex(a.corDestaque), whiteSpace: 'pre-wrap', textAlign: alin(a, 'detalhe') }}>{a.detalhe}</div>
    </Bloco>
  ) : null

export const Emojis = ({ a }) =>
  a.emojis.map((e, i) => (
    <img key={i} src={emojiUrl(e.cod)} alt="" style={{ position: 'absolute', left: e.x, top: e.y, width: e.tam, height: e.tam, transform: `rotate(${e.giro ?? 0}deg)` }} />
  ))

const Tarja = ({ children, fundo, cor, padding = '2px 18px' }) => (
  <span style={{ background: fundo, color: cor, padding, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{children}</span>
)

// ---------- templates ----------

const Tarjas = ({ a, Bloco }) => (
  <>
    <Camada a={a} src={a.foto} />
    <Veu a={a} />
    <Bloco id="titulo" largura={920}>
      <div style={{ ...estiloTitulo(a, 80), lineHeight: 1.28, textAlign: alin(a, 'titulo') }}>
        <Tarja fundo={a.semEnfeites ? undefined : hex(a.corTarja)}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></Tarja>
      </div>
    </Bloco>
    {a.texto && (
      <Bloco id="texto" largura={880}>
        <div style={{ ...estiloCorpo(a, 40), lineHeight: 1.45, textAlign: alin(a, 'texto') }}>
          <Tarja fundo={a.semEnfeites ? undefined : hex(a.corDestaque)} cor={a.semEnfeites ? hex(a.corTexto) : hex('creme')} padding="4px 14px">{a.texto}</Tarja>
        </div>
      </Bloco>
    )}
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

const CorCheia = ({ a, Bloco }) => (
  <>
    <Camada a={a} src={a.foto} />
    <Veu a={a} />
    <Bloco id="titulo" largura={860}>
      <div style={{ ...estiloTitulo(a, 108), textAlign: alin(a, 'titulo', 'center') }}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
    </Bloco>
    {a.texto && (
      <Bloco id="texto" largura={860}>
        <div style={{ ...estiloCorpo(a, 42), textAlign: alin(a, 'texto', 'center') }}>{a.texto}</div>
      </Bloco>
    )}
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

const ALCAS = [{ left: -11, top: -11 }, { right: -11, top: -11 }, { left: -11, bottom: -11 }, { right: -11, bottom: -11 }]

const Caixa = ({ a, Bloco }) => (
  <>
    <Camada a={a} src={a.foto} recorte={a.corte} />
    <Veu a={a} recorte={a.corte} />
    <Bloco id="titulo" largura={800}>
      <div style={{ position: 'relative', border: a.semEnfeites ? '4px solid transparent' : `4px dashed ${hex('tinta')}`, padding: '40px 40px 44px', textAlign: alin(a, 'titulo', 'center') }}>
        {!a.semEnfeites && ALCAS.map((p, i) => <i key={i} style={{ position: 'absolute', width: 22, height: 22, background: hex('tinta'), ...p }} />)}
        <div style={estiloTitulo(a, 96)}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
      </div>
    </Bloco>
    {a.texto && <Bloco id="texto" largura={712}><div style={{ ...estiloCorpo(a, 36), textAlign: alin(a, 'texto', 'center') }}>{a.texto}</div></Bloco>}
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

/** Linhas do texto viram balões; as que começam com ">" são as suas (à direita). */
const Chat = ({ a, Bloco }) => {
  const linhas = a.texto.split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <>
      <Bloco id="titulo" largura={920}>
        <div style={{ ...estiloTitulo(a, 84), textAlign: alin(a, 'titulo') }}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
      </Bloco>
      <Bloco id="texto" largura={940}>
        <div style={{ background: hex('areia'), borderRadius: 44, padding: '30px 30px 34px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {linhas.map((l, i) => {
            const eu = l.startsWith('>')
            return (
              <div key={i} style={{ alignSelf: eu ? 'flex-end' : 'flex-start', maxWidth: '72%', background: eu ? hex('terracota') : '#FBF8F3', color: eu ? hex('creme') : hex('tinta'), borderRadius: eu ? '30px 30px 8px 30px' : '30px 30px 30px 8px', padding: '18px 26px', ...estiloFonte(a, 'texto', 'inter'), fontWeight: 500, fontSize: tam(a, 'texto', 32), lineHeight: 1.3 }}>
                {eu ? l.slice(1).trim() : l}
              </div>
            )
          })}
        </div>
      </Bloco>
      <Detalhe a={a} Bloco={Bloco} />
    </>
  )
}

const Lupa = ({ cor }) => (
  <svg width="34" height="34" viewBox="0 0 30 30"><circle cx="12" cy="12" r="9" stroke={cor} strokeWidth="3" fill="none" /><path d="M19 19 L27 27" stroke={cor} strokeWidth="3" strokeLinecap="round" /></svg>
)

/** Primeira linha vai na barra de busca; as outras viram sugestões. */
const Busca = ({ a, Bloco }) => {
  const [busca, ...itens] = a.texto.split('\n').map((l) => l.trim()).filter(Boolean)
  const t = tam(a, 'texto', 40)
  return (
    <>
      <Bloco id="titulo" largura={920}>
        <div style={{ ...estiloTitulo(a, 100), textAlign: alin(a, 'titulo') }}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
      </Bloco>
      <Bloco id="texto" largura={940}>
        <div style={{ background: hex('creme'), borderRadius: 56, padding: '26px 34px', display: 'flex', alignItems: 'center', gap: 20, ...estiloFonte(a, 'texto', 'inter'), fontWeight: 500, fontSize: t, color: hex('tinta') }}>
          <Lupa cor={hex('cafe')} /><span>{busca}</span>
        </div>
        {itens.length > 0 && (
          <div style={{ marginTop: 16, background: hex('creme'), borderRadius: 30, padding: '14px 0', overflow: 'hidden' }}>
            {itens.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 22, alignItems: 'center', padding: '22px 34px', background: i === itens.length - 1 ? hex('pessego') : 'transparent', ...estiloFonte(a, 'texto', 'inter'), fontWeight: 500, fontSize: t * 0.95, color: hex('tinta') }}>
                <Lupa cor="#7A6E64" /><span>{it}</span>
              </div>
            ))}
          </div>
        )}
      </Bloco>
      <Detalhe a={a} Bloco={Bloco} />
    </>
  )
}

/** Seleção de texto do Android: o *trecho* marcado ganha realce, alças e a barra Copiar/Compartilhar. */
const Selecao = ({ a, Bloco }) => (
  <>
    <Camada a={a} src={a.foto} />
    <Veu a={a} />
    {a.texto && (
      <Bloco id="texto" largura={900}>
        <div style={{ ...estiloCorpo(a, 44), textAlign: alin(a, 'texto') }}>{a.texto}</div>
      </Bloco>
    )}
    <Bloco id="titulo" largura={920}>
      {!a.semEnfeites && <div style={{ display: 'inline-flex', marginBottom: 34, background: '#FBF6EC', borderRadius: 10, padding: '4px 8px', fontFamily: FONTE_CORPO, fontWeight: 500, fontSize: 28, color: hex('tinta') }}>
        <span style={{ padding: '12px 22px' }}>Copiar</span><span style={{ padding: '12px 22px' }}>Compartilhar</span><span style={{ padding: '12px 22px' }}>Selecionar tudo</span>
      </div>}
      <div style={{ ...estiloTitulo(a, 110), lineHeight: 1.12, textAlign: alin(a, 'titulo') }}>
        {partesDestaque(a.titulo).map((p, i) =>
          p.destaque ? (
            <span key={i} style={{ position: 'relative', background: 'rgba(244,195,161,.38)', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
              <i style={{ position: 'absolute', left: -26, top: -6, width: 30, height: 30, borderRadius: '50% 50% 0 50%', background: hex('pessego') }} />
              {p.t}
              <i style={{ position: 'absolute', right: -26, bottom: -26, width: 30, height: 30, borderRadius: '0 50% 50% 50%', background: hex('pessego') }} />
            </span>
          ) : (
            <span key={i}>{p.t}</span>
          ),
        )}
      </div>
    </Bloco>
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

/** Palavra gigante atrás da cabeça: foto, título, recorte da pessoa por cima, tarjas embaixo. */
const AtrasCabeca = ({ a, Bloco }) => (
  <>
    <Camada a={a} src={a.foto} />
    <Veu a={a} />
    <Bloco id="titulo" largura={1000}>
      <div style={{ ...estiloTitulo(a, 300), lineHeight: 1, color: hex(a.corTitulo), textAlign: alin(a, 'titulo', 'center') }}>{a.titulo.replace(/\*/g, '')}</div>
    </Bloco>
    <Camada a={a} src={a.recorte} />
    {a.texto && (
      <Bloco id="texto" largura={900}>
        <div style={{ ...estiloCorpo(a, 64), ...estiloFonte(a, 'texto', a.fonteTitulo), fontSize: tam(a, 'texto', 64), lineHeight: 1.25, color: hex('cafe'), textAlign: alin(a, 'texto') }}>
          <Tarja fundo={hex('creme')} padding="2px 16px">{a.texto}</Tarja>
        </div>
      </Bloco>
    )}
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

/** Bloco de cor em cima, foto embaixo com corte seco; a cabeça (recorte) passa por cima do bloco. */
const CabecaCaixa = ({ a, Bloco }) => (
  <>
    <Camada a={a} src={a.foto} recorte={a.corte} />
    <Veu a={a} recorte={a.corte} />
    <Bloco id="titulo" largura={920}>
      <div style={{ ...estiloTitulo(a, 150), lineHeight: 0.95, textAlign: alin(a, 'titulo') }}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
    </Bloco>
    <Camada a={a} src={a.recorte} />
    {a.texto && (
      <Bloco id="texto" largura={700}>
        <div style={{ ...estiloCorpo(a, 38), textAlign: alin(a, 'texto') }}>{a.texto}</div>
      </Bloco>
    )}
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

const base = { fonteTitulo: 'bootzy', corTexto: 'tinta', corDestaque: 'terracota', corTarja: 'creme', foto: '', recorte: '', fotoX: 50, fotoY: 30, fotoZoom: 100, fotoDX: 0, fotoDY: 0, fotoCorte: {}, veu: 0, corte: 0, detalhe: '', emojis: [], est: {} }

export const TEMPLATES = {
  tarjas: {
    nome: 'Tarjas sobre foto',
    Corpo: Tarjas,
    padrao: { ...base, fundo: 'cafe', corTitulo: 'cafe', veu: 0.3, titulo: 'segunda é o dia de organizar a semana.', texto: 'o resto pode esperar até quarta.', pos: { titulo: { x: 80, y: 860 }, texto: { x: 80, y: 1150 }, detalhe: { x: 600, y: 120 } }, emojis: [{ cod: '2728', x: 880, y: 760, tam: 110 }] },
  },
  atrasCabeca: {
    nome: 'Texto atrás da cabeça',
    Corpo: AtrasCabeca,
    recorta: true,
    padrao: { ...base, fundo: 'cafe', corTitulo: 'creme', veu: 0.3, titulo: 'horas', texto: 'é a planilha que\nninguém vê.', detalhe: 'de verdade.', corDestaque: 'creme', pos: { titulo: { x: 40, y: 140 }, texto: { x: 80, y: 1070 }, detalhe: { x: 760, y: 1250 } }, emojis: [{ cod: '2728', x: 890, y: 250, tam: 90 }] },
  },
  cabecaCaixa: {
    nome: 'Cabeça sobre o bloco',
    Corpo: CabecaCaixa,
    recorta: true,
    padrao: { ...base, fundo: 'terracota', corTitulo: 'creme', corTexto: 'creme', corDestaque: 'mostarda', corte: 760, titulo: 'coisas boas\nna sua semana', detalhe: 'depende do\nquanto a gente\nrepara nelas.', pos: { titulo: { x: 80, y: 110 }, detalhe: { x: 80, y: 560 } }, emojis: [{ cod: '2728', x: 880, y: 90, tam: 90 }] },
  },
  corCheia: {
    nome: 'Frase em cor cheia',
    Corpo: CorCheia,
    padrao: { ...base, fundo: 'cafe', corTitulo: 'mostarda', corTexto: 'creme', corDestaque: 'pessego', titulo: 'neutralidade de IA não se declara em nota, se prova em teste aberto.', texto: 'E até lá, desconfiar faz parte do jogo.', pos: { titulo: { x: 110, y: 300 }, texto: { x: 110, y: 1000 }, detalhe: { x: 110, y: 160 } }, emojis: [{ cod: '1f440', x: 860, y: 1180, tam: 100 }] },
  },
  caixa: {
    nome: 'Caixa tracejada',
    Corpo: Caixa,
    padrao: { ...base, fundo: 'creme', corTitulo: 'cafe', corte: 680, titulo: 'postar começou a pesar.', texto: 'Eu sabia que precisava aparecer, mas fui adiando.', pos: { titulo: { x: 140, y: 150 }, texto: { x: 184, y: 440 }, detalhe: { x: 140, y: 600 } }, emojis: [{ cod: '2728', x: 60, y: 100, tam: 100 }] },
  },
  selecao: {
    nome: 'Seleção de texto',
    Corpo: Selecao,
    padrao: { ...base, fundo: 'cafe', corTitulo: 'mostarda', corTexto: 'creme', titulo: '*Só depois que a campanha foi ao TSE.*', texto: 'Em testes publicados em 14/10, a Meta disse que travou imagens de candidatos.', pos: { texto: { x: 70, y: 200 }, titulo: { x: 70, y: 720 }, detalhe: { x: 600, y: 1220 } }, emojis: [{ cod: '1f4f0', x: 880, y: 90, tam: 110 }] },
  },
  chat: {
    nome: 'Conversa',
    Corpo: Chat,
    padrao: { ...base, fundo: 'creme', corTitulo: 'cafe', titulo: 'eu mesma testei.', texto: '> Faça uma camiseta vermelha escrito Lula 13\nNão consegui gerar a imagem que você pediu.\n> Crie uma Flávio 22\nAqui está:', pos: { titulo: { x: 70, y: 120 }, texto: { x: 70, y: 420 }, detalhe: { x: 600, y: 1240 } } },
  },
  busca: {
    nome: 'Barra de busca',
    Corpo: Busca,
    padrao: { ...base, fundo: 'terracota', corTitulo: 'creme', corDestaque: 'mostarda', titulo: 'falha técnica não encerra a conversa.', texto: 'Quem\nQuem escreve o filtro?\nQuem testa?\nQuem responde quando erra?', pos: { titulo: { x: 70, y: 140 }, texto: { x: 70, y: 470 }, detalhe: { x: 600, y: 1200 } } },
  },
}
