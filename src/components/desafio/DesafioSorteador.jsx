import { useState, useMemo, useCallback, useEffect } from "react";
import { Dices, Lock, Unlock, RefreshCw, Copy, Check, Trash2, Zap } from "lucide-react";
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

const AUTO_CONFIRM_SECONDS = 5;

function Eixo({ label, valor, extra, locked, rolling, onToggleLock }) {
  return (
    <div className={`p-4 flex items-start justify-between gap-3 transition-opacity duration-300 ${rolling ? "opacity-30" : ""}`}>
      <div className="min-w-0">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <p className="text-base font-semibold text-gray-900 mt-1 leading-snug">{valor || "—"}</p>
        {extra && <p className="text-xs text-gray-400 mt-0.5">{extra}</p>}
      </div>
      <button
        onClick={onToggleLock}
        title={locked ? "Destravar eixo" : "Travar eixo no próximo sorteio"}
        className={`shrink-0 flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
          locked
            ? "bg-orange-50 border-orange-200 text-orange-700"
            : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
        }`}
      >
        {locked ? <Lock size={11} /> : <Unlock size={11} />} {locked ? "travado" : "travar"}
      </button>
    </div>
  );
}

function HistItem({ item, index }) {
  return (
    <div className="p-3 flex items-start gap-3">
      <span className="text-[10px] text-gray-300 font-mono mt-0.5 shrink-0">{String(index).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 leading-snug">{item.subtema}</p>
        <p className="text-xs text-gray-400 mt-0.5">{item.formato} · {item.restricao} · {item.data}</p>
      </div>
      {item.foraDaZona && (
        <span className="chip bg-violet-50 text-violet-600 border border-violet-200 text-[10px] shrink-0">fora da zona</span>
      )}
    </div>
  );
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
  const [countdown, setCountdown] = useState(null);

  const usadas = useMemo(
    () => new Set(history.map((h) => comboKey(h.subtema, h.formatoId))),
    [history]
  );

  const foraDaZona = history.length > 0 && (history.length + 1) % 3 === 0;

  const confirmar = useCallback(
    (desafio) => {
      addDesafio(desafio);
      setLocks({ subtema: false, formato: false, restricao: false });
    },
    [addDesafio]
  );

  // Contagem regressiva de 5s: ao chegar em 0, registra o desafio atual no histórico.
  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown === 0) {
      confirmar(atual);
      setCountdown(null);
      return undefined;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? c : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, atual, confirmar]);

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

    setCountdown(null);
    setRolling(true);
    setTimeout(() => {
      setAtual(novo);
      setRolling(false);
      setCountdown(AUTO_CONFIRM_SECONDS);
    }, 350);
  }, [history, atual, locks, usadas, foraDaZona]);

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

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border border-orange-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-amber-100">
                <Dices size={16} className="text-amber-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Desafio de Formato</h2>
            </div>
            <p className="text-sm text-gray-500 max-w-lg">
              Sorteia subtema, formato e restrição pra te tirar da zona de conforto. Trave um eixo se quiser mantê-lo no próximo sorteio.
            </p>
          </div>
          <span className="chip bg-white border border-orange-200 text-orange-700 text-xs shrink-0">{history.length} feitos</span>
        </div>
      </div>

      {foraDaZona && (
        <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-700 font-medium">
          <Zap size={14} className="shrink-0" /> Sorteio fora da zona: vídeo obrigatório com pilar fora de IA &amp; Tech.
        </div>
      )}

      {/* Eixos */}
      <div className="card divide-y divide-gray-100">
        <Eixo
          label="Subtema"
          valor={atual?.subtema}
          extra={atual?.pilar}
          locked={locks.subtema}
          rolling={rolling}
          onToggleLock={() => toggleLock("subtema")}
        />
        <Eixo
          label="Formato"
          valor={atual?.formato}
          locked={locks.formato}
          rolling={rolling}
          onToggleLock={() => toggleLock("formato")}
        />
        <Eixo
          label="Restrição"
          valor={atual?.restricao}
          locked={locks.restricao}
          rolling={rolling}
          onToggleLock={() => toggleLock("restricao")}
        />
      </div>

      {/* Auto-confirm countdown */}
      {countdown !== null && (
        <div className="card p-4 flex items-center gap-3 border-orange-200 bg-orange-50/50">
          <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin shrink-0" />
          <p className="text-sm text-gray-700">
            Registrando no histórico em <span className="font-semibold text-orange-600">{countdown}s</span>... gere outra ideia pra cancelar.
          </p>
        </div>
      )}
      {atual && jaConfirmado && countdown === null && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium px-1">
          <Check size={13} /> Registrado no histórico
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={sortear} className="btn-primary">
          {rolling ? <><RefreshCw size={14} className="animate-spin" /> Sorteando...</> : <><Dices size={14} /> Gerar nova ideia</>}
        </button>
        <button
          onClick={copiarBriefing}
          disabled={!atual}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar briefing</>}
        </button>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Histórico</span>
            <button
              onClick={() => {
                if (window.confirm("Limpar todo o histórico de desafios?")) {
                  clearDesafioHistory();
                }
              }}
              className="btn-ghost text-xs"
            >
              <Trash2 size={12} /> Limpar
            </button>
          </div>
          <div className="card divide-y divide-gray-100">
            {[...history].reverse().map((h, i) => (
              <HistItem key={`${h.subtema}-${h.formatoId}`} item={h} index={history.length - i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
