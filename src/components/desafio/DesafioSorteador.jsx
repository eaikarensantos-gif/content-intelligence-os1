import { useState, useMemo, useCallback } from "react";
import useStore from "../../store/useStore";

/* ============================================================
   DESAFIO DE FORMATO — Content Intelligence OS
   Sorteia: subtema (ponderado por pilar) + formato + restrição.
   Regras:
   - Nunca repete a mesma combinação subtema+formato.
   - Mantém um eixo do sorteio anterior e troca o outro (alternando).
   - A cada 3 sorteios, força combinação fora da zona:
     formato de vídeo com pilar que não seja IA & Tech.
   - Eixos podem ser travados individualmente antes de re-sortear.
   PERSISTÊNCIA: o histórico vive no store global (zustand + persist),
   junto com o restante dos dados do Content OS.
   ============================================================ */

const PILARES = [
  {
    id: "carreira",
    nome: "Carreira & Maturidade",
    peso: 40,
    subtemas: [
      "Decisão que você adiou e o custo disso",
      "Comportamento que o mercado premia mas não fala",
      "O que senioridade não resolve",
      "Erro seu com leitura atual",
    ],
  },
  {
    id: "decisao",
    nome: "Decisão & Estratégia",
    peso: 25,
    subtemas: [
      "Critério explícito pra uma escolha comum",
      "Decisão pública de empresa analisada",
      "Trade-off que ninguém quantifica",
      "Quando o dado contradiz a intuição",
    ],
  },
  {
    id: "ia",
    nome: "IA & Tech",
    peso: 25,
    subtemas: [
      "Ferramenta testada com resultado real",
      "Hype desmontado com lógica causal",
      "Limite técnico que você encontrou na prática",
      "O que mudou no seu workflow esse mês",
    ],
  },
  {
    id: "humor",
    nome: "Humor / Naomi",
    peso: 10,
    subtemas: [
      "Naomi RH avalia situação corporativa real",
      "Absurdo do mercado tratado com seriedade fingida",
    ],
  },
];

const FORMATOS = [
  { id: "car-info", nome: "Carrossel informativo", video: false },
  { id: "car-story", nome: "Carrossel storytelling", video: false },
  { id: "car-texto", nome: "Carrossel-texto", video: false },
  { id: "talking", nome: "Talking head", video: true },
  { id: "screencast", nome: "Screencast", video: true },
  { id: "fundoverde", nome: "Fundo verde reagindo", video: true },
  { id: "foto-legenda", nome: "Foto + legenda longa", video: false },
  { id: "print", nome: "Print + comentário", video: false },
  { id: "tbt", nome: "TBT com leitura atual", video: false },
];

const RESTRICOES = [
  "Sem hook de pergunta. Abre com dado.",
  "Máximo 6 slides ou 45 segundos.",
  "Tem que admitir uma fissura explícita.",
  "Zero primeira pessoa até a metade.",
  "Fechar com número, não com frase.",
  "Formato que você nunca usou com esse pilar.",
];

const MASTER_PROMPT = `Você escreve conteúdo para Karen Santos. Designer há mais de 10 anos, especialista em IA para negócios. Analítica, técnica, premium/minimalista. Não vende sonhos, vende estrutura e tomada de decisão.

BRIEFING DESTE POST
Pilar: {{pilar}}
Subtema: {{subtema}}
Formato: {{formato}}
Restrição obrigatória: {{restricao}}

REGRAS DE ESTILO (inegociáveis)
1. Proibido "não é sobre X, é sobre Y" ou qualquer oposição estilizada. Contraste só com dado ou lógica causal.
2. Proibido ritmo de sermão: frases curtas picotadas em sequência.
3. Travessão só para interrupção de pensamento real, nunca para impacto.
4. Termos proibidos: "braço", "mindset", "propósito", "transformação", "ecossistema" (uso vago).
5. Vocabulário curto e simples. Se ficou bonito demais, simplifique. Clareza técnica, não poética.
6. Misture frase longa de explicação técnica com curta de fechamento. Fuja da cadência 1-1-1.
7. Oralidade real, como áudio para um par sênior: "O ponto é...", "Na prática...", "O que acontece aqui é...".
8. Fissuras: se o raciocínio não estiver 100% fechado, admita. Fissura é racional e conversacional, nunca drama, metáfora decorativa ou apelo emocional.
9. Fechamento seco: conclusão prática, dado ou observação. Proibido "Vamos juntos?", "Concorda?" ou frase de efeito.

VALIDAÇÃO FINAL
Antes de entregar, pergunte: "Esse texto poderia estar num print de posts saturados de IA?" Se sim, reescreva do zero ignorando boas práticas de engajamento.`;

/* ---------- helpers ---------- */

function sorteioPonderado(rng) {
  const total = PILARES.reduce((s, p) => s + p.peso, 0);
  let r = rng() * total;
  for (const p of PILARES) {
    r -= p.peso;
    if (r <= 0) return p;
  }
  return PILARES[0];
}

function comboKey(subtema, formatoId) {
  return `${subtema}::${formatoId}`;
}

export default function DesafioSorteador() {
  // Persistência via store global (zustand + persist + sync Supabase)
  const history = useStore((s) => s.desafioHistory);
  const addDesafio = useStore((s) => s.addDesafio);
  const clearDesafioHistory = useStore((s) => s.clearDesafioHistory);

  const [atual, setAtual] = useState(null);
  const [locks, setLocks] = useState({ subtema: false, formato: false, restricao: false });
  const [copiado, setCopiado] = useState(false);
  const [rolling, setRolling] = useState(false);

  const usadas = useMemo(
    () => new Set(history.map((h) => comboKey(h.subtema, h.formatoId))),
    [history]
  );

  const foraDaZona = history.length > 0 && (history.length + 1) % 3 === 0;

  const sortear = useCallback(() => {
    const rng = Math.random;
    const anterior = history[history.length - 1] || null;
    let tentativa = 0;
    let novo = null;

    while (tentativa < 300) {
      tentativa++;

      // eixo subtema
      let pilar, subtema;
      if (locks.subtema && atual) {
        pilar = PILARES.find((p) => p.nome === atual.pilar);
        subtema = atual.subtema;
      } else if (foraDaZona) {
        const naoIA = PILARES.filter((p) => p.id !== "ia");
        pilar = naoIA[Math.floor(rng() * naoIA.length)];
        subtema = pilar.subtemas[Math.floor(rng() * pilar.subtemas.length)];
      } else {
        pilar = sorteioPonderado(rng);
        subtema = pilar.subtemas[Math.floor(rng() * pilar.subtemas.length)];
      }

      // eixo formato
      let formato;
      if (locks.formato && atual) {
        formato = FORMATOS.find((f) => f.id === atual.formatoId);
      } else if (foraDaZona) {
        const videos = FORMATOS.filter((f) => f.video);
        formato = videos[Math.floor(rng() * videos.length)];
      } else {
        formato = FORMATOS[Math.floor(rng() * FORMATOS.length)];
      }

      // eixo restrição
      const restricao =
        locks.restricao && atual
          ? atual.restricao
          : RESTRICOES[Math.floor(rng() * RESTRICOES.length)];

      // regra: nunca repetir combinação subtema+formato
      if (usadas.has(comboKey(subtema, formato.id))) continue;

      // regra: manter um eixo e trocar o outro em relação ao anterior
      if (anterior && !foraDaZona && !locks.subtema && !locks.formato) {
        const mesmoSub = anterior.subtema === subtema;
        const mesmoFmt = anterior.formatoId === formato.id;
        if (mesmoSub === mesmoFmt) continue; // ou repete os dois, ou nenhum: inválido
      }

      novo = {
        pilar: pilar.nome,
        subtema,
        formato: formato.nome,
        formatoId: formato.id,
        restricao,
        foraDaZona,
        data: new Date().toLocaleDateString("pt-BR"),
      };
      break;
    }

    if (!novo) return; // esgotou combinações válidas

    setRolling(true);
    setTimeout(() => {
      setAtual(novo);
      setRolling(false);
    }, 350);
  }, [history, atual, locks, usadas, foraDaZona]);

  const confirmar = () => {
    if (!atual) return;
    addDesafio(atual);
    setLocks({ subtema: false, formato: false, restricao: false });
  };

  const jaConfirmado =
    atual && usadas.has(comboKey(atual.subtema, atual.formatoId));

  const copiarBriefing = async () => {
    if (!atual) return;
    const texto = MASTER_PROMPT.replace("{{pilar}}", atual.pilar)
      .replace("{{subtema}}", atual.subtema)
      .replace("{{formato}}", atual.formato)
      .replace("{{restricao}}", atual.restricao);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  };

  const toggleLock = (eixo) =>
    setLocks((l) => ({ ...l, [eixo]: !l[eixo] }));

  const Eixo = ({ label, valor, eixo, extra }) => (
    <div className={`ds-eixo ${rolling ? "ds-roll" : ""}`}>
      <div className="ds-eixo-head">
        <span className="ds-eixo-label">{label}</span>
        <button
          className={`ds-lock ${locks[eixo] ? "ds-lock-on" : ""}`}
          onClick={() => toggleLock(eixo)}
          title={locks[eixo] ? "Destravar eixo" : "Travar eixo no próximo sorteio"}
        >
          {locks[eixo] ? "travado" : "travar"}
        </button>
      </div>
      <div className="ds-eixo-valor">{valor || "—"}</div>
      {extra && <div className="ds-eixo-extra">{extra}</div>}
    </div>
  );

  return (
    <div className="ds-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..800&family=Archivo+Expanded:wght@600;700&display=swap');
        .ds-root {
          --ink: #16161a;
          --paper: #ffffff;
          --line: #e4e4e2;
          --mute: #8a8a86;
          --sinal: #2743f0;
          font-family: 'Archivo', system-ui, sans-serif;
          background: var(--paper);
          color: var(--ink);
          max-width: 640px;
          margin: 0 auto;
          padding: 32px 20px 48px;
          font-variant-numeric: tabular-nums;
        }
        .ds-top { display:flex; justify-content:space-between; align-items:baseline; border-bottom:2px solid var(--ink); padding-bottom:12px; }
        .ds-title { font-family:'Archivo', sans-serif; font-stretch: 125%; font-weight:800; font-size:20px; letter-spacing:-0.01em; text-transform:uppercase; }
        .ds-count { font-size:13px; color:var(--mute); }
        .ds-alerta { margin-top:16px; font-size:13px; padding:10px 12px; border:1px solid var(--sinal); color:var(--sinal); }
        .ds-eixos { margin-top:20px; display:flex; flex-direction:column; gap:1px; background:var(--line); border:1px solid var(--line); }
        .ds-eixo { background:var(--paper); padding:16px; transition:opacity .3s; }
        .ds-roll { opacity:.25; }
        .ds-eixo-head { display:flex; justify-content:space-between; align-items:center; }
        .ds-eixo-label { font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--mute); }
        .ds-lock { font-family:inherit; font-size:11px; text-transform:uppercase; letter-spacing:.08em; background:none; border:1px solid var(--line); color:var(--mute); padding:3px 8px; cursor:pointer; }
        .ds-lock-on { border-color:var(--ink); color:var(--ink); }
        .ds-lock:focus-visible, .ds-btn:focus-visible { outline:2px solid var(--sinal); outline-offset:2px; }
        .ds-eixo-valor { margin-top:8px; font-size:19px; font-weight:600; line-height:1.25; letter-spacing:-0.01em; }
        .ds-eixo-extra { margin-top:4px; font-size:13px; color:var(--mute); }
        .ds-acoes { margin-top:20px; display:flex; gap:8px; flex-wrap:wrap; }
        .ds-btn { font-family:inherit; font-size:14px; font-weight:600; padding:12px 18px; cursor:pointer; border:1px solid var(--ink); background:var(--ink); color:var(--paper); flex:1; min-width:140px; }
        .ds-btn:disabled { opacity:.35; cursor:default; }
        .ds-btn-ghost { background:var(--paper); color:var(--ink); }
        .ds-hist { margin-top:36px; }
        .ds-hist-head { display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--line); padding-bottom:8px; }
        .ds-hist-title { font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--mute); }
        .ds-hist-clear { font-family:inherit; font-size:11px; text-transform:uppercase; letter-spacing:.08em; background:none; border:none; color:var(--mute); cursor:pointer; padding:0; }
        .ds-hist-clear:hover { color:var(--ink); }
        .ds-hist-item { display:flex; gap:12px; padding:12px 0; border-bottom:1px solid var(--line); font-size:14px; align-items:baseline; }
        .ds-hist-n { color:var(--mute); font-size:12px; min-width:24px; }
        .ds-hist-sub { font-weight:600; }
        .ds-hist-meta { color:var(--mute); font-size:13px; }
        .ds-fz { color:var(--sinal); font-size:11px; text-transform:uppercase; letter-spacing:.08em; }
        @media (prefers-reduced-motion: reduce) { .ds-eixo { transition:none; } }
      `}</style>

      <div className="ds-top">
        <div className="ds-title">Desafio de formato</div>
        <div className="ds-count">{history.length} feitos</div>
      </div>

      {foraDaZona && (
        <div className="ds-alerta">
          Sorteio fora da zona: vídeo obrigatório com pilar fora de IA & Tech.
        </div>
      )}

      <div className="ds-eixos">
        <Eixo
          label="Subtema"
          eixo="subtema"
          valor={atual?.subtema}
          extra={atual?.pilar}
        />
        <Eixo label="Formato" eixo="formato" valor={atual?.formato} />
        <Eixo label="Restrição" eixo="restricao" valor={atual?.restricao} />
      </div>

      <div className="ds-acoes">
        <button className="ds-btn ds-btn-ghost" onClick={sortear}>
          {atual ? "Re-sortear" : "Sortear"}
        </button>
        <button
          className="ds-btn ds-btn-ghost"
          onClick={copiarBriefing}
          disabled={!atual}
        >
          {copiado ? "Copiado" : "Copiar briefing"}
        </button>
        <button className="ds-btn" onClick={confirmar} disabled={!atual || jaConfirmado}>
          {jaConfirmado ? "Registrado" : "Aceitar desafio"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="ds-hist">
          <div className="ds-hist-head">
            <div className="ds-hist-title">Histórico</div>
            <button
              className="ds-hist-clear"
              onClick={() => {
                if (window.confirm("Limpar todo o histórico de desafios?")) {
                  clearDesafioHistory();
                }
              }}
            >
              limpar
            </button>
          </div>
          {[...history].reverse().map((h, i) => (
            <div className="ds-hist-item" key={`${h.subtema}-${h.formatoId}`}>
              <span className="ds-hist-n">{String(history.length - i).padStart(2, "0")}</span>
              <span>
                <span className="ds-hist-sub">{h.subtema}</span>{" "}
                <span className="ds-hist-meta">
                  · {h.formato} · {h.restricao} · {h.data}
                </span>{" "}
                {h.foraDaZona && <span className="ds-fz">fora da zona</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
