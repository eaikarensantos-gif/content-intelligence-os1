import { FONTES_TITULO, FONTE_CORPO, FONTE_DETALHE, hex, partesDestaque, emojiUrl } from './marca'

// Cada template desenha a arte em tamanho real (1080 de largura). Os blocos de texto ficam dentro de
// <Bloco id>, que o canvas posiciona por arte.pos[id] e deixa arrastar. Sem sombra em nenhum lugar.

const Rico = ({ texto, cor }) =>
  partesDestaque(texto).map((p, i) => (p.destaque ? <span key={i} style={{ color: cor }}>{p.t}</span> : <span key={i}>{p.t}</span>))

const estiloTitulo = (a, tamanho) => {
  const f = FONTES_TITULO[a.fonteTitulo]
  return { fontFamily: f.css, fontStyle: f.estilo, letterSpacing: f.tracking, fontSize: tamanho, lineHeight: 1.02, color: hex(a.corTitulo), whiteSpace: 'pre-wrap' }
}
const estiloCorpo = (a, tamanho = 40) => ({ fontFamily: FONTE_CORPO, fontWeight: 500, fontSize: tamanho, lineHeight: 1.32, letterSpacing: '-0.01em', color: hex(a.corTexto), whiteSpace: 'pre-wrap' })

/** Foto de fundo com enquadramento e véu chapado (nunca degradê). */
export const FotoFundo = ({ a, topo = 0 }) =>
  a.foto ? (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: topo, bottom: 0, backgroundImage: `url(${a.foto})`, backgroundSize: `${a.fotoZoom}%`, backgroundPosition: `${a.fotoX}% ${a.fotoY}%`, backgroundRepeat: 'no-repeat' }} />
      {a.veu > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: topo, bottom: 0, background: hex('tinta'), opacity: a.veu }} />}
    </>
  ) : null

const Detalhe = ({ a, Bloco }) =>
  a.detalhe ? (
    <Bloco id="detalhe" largura={460}>
      <div style={{ fontFamily: FONTE_DETALHE, fontSize: 46, lineHeight: 1.15, color: hex(a.corDestaque), whiteSpace: 'pre-wrap' }}>{a.detalhe}</div>
    </Bloco>
  ) : null

export const Emojis = ({ a }) =>
  a.emojis.map((e, i) => (
    <img key={i} src={emojiUrl(e.cod)} alt="" style={{ position: 'absolute', left: e.x, top: e.y, width: e.tam, height: e.tam, transform: `rotate(${e.giro ?? 0}deg)` }} />
  ))

// ---------- templates ----------

const Tarjas = ({ a, Bloco }) => (
  <>
    <FotoFundo a={a} />
    <Bloco id="titulo" largura={920}>
      <div style={{ ...estiloTitulo(a, a.tamanhoTitulo), lineHeight: 1.28 }}>
        <span style={{ background: hex(a.corTarja), padding: '2px 18px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
          <Rico texto={a.titulo} cor={hex(a.corDestaque)} />
        </span>
      </div>
    </Bloco>
    {a.texto && (
      <Bloco id="texto" largura={880}>
        <div style={{ ...estiloCorpo(a, 40), lineHeight: 1.45 }}>
          <span style={{ background: hex(a.corDestaque), color: hex('creme'), padding: '4px 14px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{a.texto}</span>
        </div>
      </Bloco>
    )}
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

const CorCheia = ({ a, Bloco }) => (
  <>
    <Bloco id="titulo" largura={860}>
      <div style={{ ...estiloTitulo(a, a.tamanhoTitulo), textAlign: 'center' }}>
        <Rico texto={a.titulo} cor={hex(a.corDestaque)} />
      </div>
    </Bloco>
    {a.texto && (
      <Bloco id="texto" largura={860}>
        <div style={{ ...estiloCorpo(a, 42), textAlign: 'center' }}>{a.texto}</div>
      </Bloco>
    )}
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

const ALCAS = [{ left: -11, top: -11 }, { right: -11, top: -11 }, { left: -11, bottom: -11 }, { right: -11, bottom: -11 }]

const Caixa = ({ a, Bloco }) => (
  <>
    <FotoFundo a={a} topo={a.corte} />
    <Bloco id="titulo" largura={800}>
      <div style={{ position: 'relative', border: `4px dashed ${hex('tinta')}`, padding: '40px 40px 44px', textAlign: 'center' }}>
        {ALCAS.map((p, i) => <i key={i} style={{ position: 'absolute', width: 22, height: 22, background: hex('tinta'), ...p }} />)}
        <div style={estiloTitulo(a, a.tamanhoTitulo)}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
        {a.texto && <div style={{ ...estiloCorpo(a, 36), marginTop: 22 }}>{a.texto}</div>}
      </div>
    </Bloco>
    <Detalhe a={a} Bloco={Bloco} />
  </>
)

/** Linhas do texto viram balões; as que começam com ">" são as suas (à direita). */
const Chat = ({ a, Bloco }) => {
  const linhas = a.texto.split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <>
      <Bloco id="titulo" largura={920}>
        <div style={estiloTitulo(a, a.tamanhoTitulo)}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
      </Bloco>
      <Bloco id="texto" largura={940}>
        <div style={{ background: hex('areia'), borderRadius: 44, padding: '30px 30px 34px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {linhas.map((l, i) => {
            const eu = l.startsWith('>')
            return (
              <div key={i} style={{ alignSelf: eu ? 'flex-end' : 'flex-start', maxWidth: 680, background: eu ? hex('terracota') : '#FBF8F3', color: eu ? hex('creme') : hex('tinta'), borderRadius: eu ? '30px 30px 8px 30px' : '30px 30px 30px 8px', padding: '18px 26px', fontFamily: FONTE_CORPO, fontWeight: 500, fontSize: 32, lineHeight: 1.3 }}>
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
  return (
    <>
      <Bloco id="titulo" largura={920}>
        <div style={estiloTitulo(a, a.tamanhoTitulo)}><Rico texto={a.titulo} cor={hex(a.corDestaque)} /></div>
      </Bloco>
      <Bloco id="texto" largura={940}>
        <div style={{ background: hex('creme'), borderRadius: 56, padding: '26px 34px', display: 'flex', alignItems: 'center', gap: 20, fontFamily: FONTE_CORPO, fontWeight: 500, fontSize: 40, color: hex('tinta') }}>
          <Lupa cor={hex('cafe')} /><span>{busca}</span>
        </div>
        {itens.length > 0 && (
          <div style={{ marginTop: 16, background: hex('creme'), borderRadius: 30, padding: '14px 0', overflow: 'hidden' }}>
            {itens.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 22, alignItems: 'center', padding: '22px 34px', background: i === itens.length - 1 ? hex('pessego') : 'transparent', fontFamily: FONTE_CORPO, fontWeight: 500, fontSize: 38, color: hex('tinta') }}>
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

const base = { formato: 'feed', fonteTitulo: 'bootzy', corTexto: 'tinta', corDestaque: 'terracota', corTarja: 'creme', foto: '', fotoX: 50, fotoY: 30, fotoZoom: 100, veu: 0, detalhe: '', emojis: [] }

export const TEMPLATES = {
  tarjas: {
    nome: 'Tarjas sobre foto',
    Corpo: Tarjas,
    padrao: { ...base, fundo: 'cafe', corTitulo: 'cafe', veu: 0.3, tamanhoTitulo: 80, titulo: 'segunda é o dia de organizar a semana.', texto: 'o resto pode esperar até quarta.', pos: { titulo: { x: 80, y: 860 }, texto: { x: 80, y: 1150 }, detalhe: { x: 600, y: 120 } }, emojis: [{ cod: '2728', x: 880, y: 760, tam: 110 }] },
  },
  corCheia: {
    nome: 'Frase em cor cheia',
    Corpo: CorCheia,
    padrao: { ...base, fundo: 'cafe', corTitulo: 'mostarda', corTexto: 'creme', corDestaque: 'pessego', tamanhoTitulo: 108, titulo: 'neutralidade de IA não se declara em nota, se prova em teste aberto.', texto: 'E até lá, desconfiar faz parte do jogo.', pos: { titulo: { x: 110, y: 300 }, texto: { x: 110, y: 1000 }, detalhe: { x: 110, y: 160 } }, emojis: [{ cod: '1f440', x: 860, y: 1180, tam: 100 }] },
  },
  caixa: {
    nome: 'Caixa tracejada',
    Corpo: Caixa,
    padrao: { ...base, fundo: 'creme', corTitulo: 'cafe', corte: 680, tamanhoTitulo: 96, titulo: 'postar começou a pesar.', texto: 'Eu sabia que precisava aparecer, mas fui adiando.', pos: { titulo: { x: 140, y: 150 }, detalhe: { x: 140, y: 600 } }, emojis: [{ cod: '2728', x: 60, y: 100, tam: 100 }] },
  },
  chat: {
    nome: 'Conversa',
    Corpo: Chat,
    padrao: { ...base, fundo: 'creme', corTitulo: 'cafe', tamanhoTitulo: 84, titulo: 'eu mesma testei.', texto: '> Faça uma camiseta vermelha escrito Lula 13\nNão consegui gerar a imagem que você pediu.\n> Crie uma Flávio 22\nAqui está:', pos: { titulo: { x: 70, y: 120 }, texto: { x: 70, y: 420 }, detalhe: { x: 600, y: 1240 } } },
  },
  busca: {
    nome: 'Barra de busca',
    Corpo: Busca,
    padrao: { ...base, fundo: 'terracota', corTitulo: 'creme', corDestaque: 'mostarda', tamanhoTitulo: 100, titulo: 'falha técnica não encerra a conversa.', texto: 'Quem\nQuem escreve o filtro?\nQuem testa?\nQuem responde quando erra?', pos: { titulo: { x: 70, y: 140 }, texto: { x: 70, y: 470 }, detalhe: { x: 600, y: 1200 } } },
  },
}
