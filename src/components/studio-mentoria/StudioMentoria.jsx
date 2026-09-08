import { useMemo, useState } from 'react';
import { TEMAS, PILARES, METAS, MIX_MENSAL } from '../../data/studioMentoriaTemas';
import {
  buildStudioMentoriaPrompt,
  lintTexto,
  validarGates,
  FORMATOS,
} from '../../data/studioMentoriaPrompt';
import { extractJsonObject, assertNotTruncated } from '../../utils/aiJson';

const LS_KEY = 'cio-openai-key';

async function callAI(apiKey, body) {
  const res = await fetch('/api/ai?action=openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro na API: ${res.status}`);
  }
  return res.json();
}

/**
 * Studio Mentoria
 *
 * Página de produção de conteúdo orgânico. Três coisas, nessa ordem de importância:
 * 1. impedir que saia post que não passa nos dois gates
 * 2. manter a esteira em 8 orgânicos por mês, no mix 4/2/2
 * 3. gerar rascunho com a IA já dentro do contrato de voz e de limites
 *
 * A IA aqui não sugere estratégia. A estratégia está fechada em
 * data/studioMentoriaPrompt.js e ela obedece.
 */

const FORMATO_LABEL = { contagem: 'Contagem', cpf: 'CPF', react: 'React' };

function Badge({ children, tone = 'neutro' }) {
  const tones = {
    neutro: 'bg-neutral-100 text-neutral-600',
    ok: 'bg-emerald-50 text-emerald-700',
    alerta: 'bg-amber-50 text-amber-700',
    erro: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

function temaCompleto(t) {
  if (t.formato === 'contagem') {
    return Boolean(t.perguntaContagem && t.regua && t.faixas && t.ponte);
  }
  return Boolean(t.ponte || t.perguntaComentario);
}

export default function StudioMentoria() {
  const [pilar, setPilar] = useState('todos');
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [instrucaoExtra, setInstrucaoExtra] = useState('');
  const [saida, setSaida] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  const temas = useMemo(() => {
    return TEMAS.filter(t => (pilar === 'todos' ? true : t.pilar === pilar)).filter(t =>
      somentePendentes ? !temaCompleto(t) : true
    );
  }, [pilar, somentePendentes]);

  const prontos = TEMAS.filter(temaCompleto).length;

  async function gerar(tema) {
    setGerando(true);
    setErro(null);
    setSaida(null);
    try {
      const apiKey = localStorage.getItem(LS_KEY) || '';
      if (!apiKey) {
        throw new Error('Nenhuma chave de API configurada. Vá em Configurações para adicionar.');
      }
      const prompt = buildStudioMentoriaPrompt({
        tema,
        formato: tema.formato || 'contagem',
        extra: instrucaoExtra,
      });
      const res = await callAI(apiKey, {
        model: 'gpt-5.6-terra',
        max_tokens: 3000,
        system: 'Responda APENAS com JSON válido, sem explicações, sem markdown. Comece com { e termine com }.',
        messages: [{ role: 'user', content: prompt }],
      });
      assertNotTruncated(res);
      const text = res.content?.find(b => b.type === 'text')?.text || '';
      const parsed = extractJsonObject(text, 'A IA não retornou um rascunho válido.');

      // Segunda barreira: a IA pode escorregar, o linter não.
      const textoInteiro = JSON.stringify(parsed.slides || {}) + ' ' + (parsed.legenda || '');
      parsed._lint = lintTexto(textoInteiro);
      parsed._gates = validarGates(parsed.slides);
      setSaida(parsed);
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Studio Mentoria</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {TEMAS.length} temas · {prontos} prontos · esteira de {METAS.organicosMes} orgânicos por mês
          no mix {MIX_MENSAL.contagem}/{MIX_MENSAL.cpf}/{MIX_MENSAL.react}
        </p>
      </header>

      {/* Metas. Ficam visíveis porque a decisão diária é sobre elas. */}
      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Meta
          rotulo="Engajamento de seguidor"
          valor={`${(METAS.engajamentoSeguidorAtual * 100).toFixed(2)}%`}
          alvo={`piso ${(METAS.engajamentoSeguidorPiso * 100).toFixed(0)}%`}
        />
        <Meta
          rotulo="UER Samsung"
          valor={`${(METAS.uerSamsungAtual * 100).toFixed(2)}%`}
          alvo={`meta ${(METAS.uerSamsungMeta * 100).toFixed(0)}%`}
        />
        <Meta
          rotulo="Interações por post"
          valor={String(METAS.interacoesMediaAtual)}
          alvo={`alvo ${METAS.interacoesMediaPiso}`}
        />
        <Meta
          rotulo="Salvamento / curtida"
          valor={METAS.salvamentoPorCurtidaAtual.toFixed(2)}
          alvo={`alvo ${METAS.salvamentoPorCurtidaAlvo.toFixed(2)}`}
        />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={pilar}
          onChange={e => setPilar(e.target.value)}
          className="rounded border border-neutral-200 px-3 py-1.5 text-sm"
        >
          <option value="todos">Todos os pilares</option>
          {Object.values(PILARES).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={somentePendentes}
            onChange={e => setSomentePendentes(e.target.checked)}
          />
          só os que faltam campo
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <ul className="space-y-2">
          {temas.map(t => {
            const completo = temaCompleto(t);
            return (
              <li key={t.id}>
                <button
                  onClick={() => { setSelecionado(t); setSaida(null); }}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    selecionado?.id === t.id
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">{t.titulo}</span>
                    <div className="flex shrink-0 gap-1">
                      {t.prioridade === 'alta' && <Badge tone="alerta">prioridade</Badge>}
                      <Badge tone={completo ? 'ok' : 'neutro'}>
                        {completo ? 'pronto' : 'rascunho'}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {FORMATO_LABEL[t.formato]} · {t.pilar} · {t.fonte}
                  </p>
                  {t.perguntaContagem && (
                    <p className="mt-2 text-sm text-neutral-700">{t.perguntaContagem}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="md:sticky md:top-6 md:self-start">
          {!selecionado && (
            <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-sm text-neutral-500">
              Escolhe um tema pra gerar o rascunho.
            </div>
          )}

          {selecionado && (
            <div className="rounded-lg border border-neutral-200 p-5">
              <h2 className="text-lg font-medium">{selecionado.titulo}</h2>

              {selecionado.ancora ? (
                <p className="mt-2 rounded bg-neutral-50 p-3 text-sm text-neutral-700">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">âncora</span>
                  <br />
                  {selecionado.ancora}
                </p>
              ) : (
                <p className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-800">
                  Sem âncora. Sem um fato real seu, o post volta pro registro de consultora.
                  Escreve a âncora antes de gerar.
                </p>
              )}

              {selecionado.nota && (
                <p className="mt-2 text-xs text-neutral-500">{selecionado.nota}</p>
              )}

              <textarea
                value={instrucaoExtra}
                onChange={e => setInstrucaoExtra(e.target.value)}
                placeholder="Instrução adicional, opcional. Ex: usar o número que eu medi ontem, 3 de 9."
                className="mt-4 w-full rounded border border-neutral-200 p-3 text-sm"
                rows={3}
              />

              <button
                onClick={() => gerar(selecionado)}
                disabled={gerando || !selecionado.ancora}
                className="mt-3 w-full rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {gerando ? 'gerando' : `gerar ${FORMATO_LABEL[selecionado.formato]}`}
              </button>

              {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}

              {saida && <Resultado saida={saida} />}
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500">
        <p className="font-medium text-neutral-700">Limites que a IA não pode relaxar</p>
        <p className="mt-2">
          Nunca inventa número da Karen. Nunca propõe identidade como alavanca de alcance.
          Nunca cita resposta de lead literalmente, só número agregado. Nunca sugere aumentar
          frequência pra melhorar engajamento de seguidor. Nunca escreve reclamação sem entrega.
        </p>
        <p className="mt-2">
          Estratégia fechada em <code>data/studioMentoriaPrompt.js</code>. Mudança entra lá primeiro.
        </p>
      </footer>
    </div>
  );
}

function Meta({ rotulo, valor, alvo }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{rotulo}</p>
      <p className="mt-1 text-xl font-medium tabular-nums">{valor}</p>
      <p className="text-xs text-neutral-400">{alvo}</p>
    </div>
  );
}

function Resultado({ saida }) {
  const { slides = {}, fissura, perguntaComentario, legenda, numerosPendentes = [], autoCritica } = saida;
  const gates = saida._gates || {};
  const lint = saida._lint || [];

  return (
    <div className="mt-5 border-t border-neutral-200 pt-5">
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone={gates.contagem ? 'ok' : 'erro'}>
          gate contagem {gates.contagem ? 'ok' : 'reprovado'}
        </Badge>
        <Badge tone={gates.ponte ? 'ok' : 'erro'}>
          gate ponte {gates.ponte ? 'ok' : 'reprovado'}
        </Badge>
        <Badge tone={lint.length ? 'erro' : 'ok'}>
          {lint.length ? `linter: ${lint.join(', ')}` : 'linter ok'}
        </Badge>
      </div>

      {(!gates.contagem || !gates.ponte || lint.length > 0) && (
        <p className="mb-3 rounded bg-rose-50 p-3 text-sm text-rose-800">
          Não posta assim. Corrige o que está marcado ou gera de novo.
        </p>
      )}

      <ol className="space-y-3 text-sm">
        {[
          ['capa', slides.capa],
          ['âncora', slides.ancora],
          ['régua', slides.regua && `Conta: ${(slides.regua.conta || []).join('; ')} — Não conta: ${(slides.regua.naoConta || []).join('; ')}`],
          ['execução', slides.execucao],
          ['faixa baixa', slides.faixaBaixa],
          ['faixa alta', slides.faixaAlta],
          ['ponte', slides.ponte],
        ].map(([rotulo, texto], i) => (
          <li key={rotulo} className="rounded border border-neutral-100 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {i + 1} · {rotulo}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{texto || '—'}</p>
          </li>
        ))}
      </ol>

      {fissura && (
        <p className="mt-3 rounded bg-neutral-50 p-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-neutral-400">
            fissura · {fissura.slide}
          </span>
          <br />
          {fissura.texto}
        </p>
      )}

      {perguntaComentario && (
        <p className="mt-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-neutral-400">
            pergunta do comentário
          </span>
          <br />
          {perguntaComentario}
        </p>
      )}

      {legenda && (
        <p className="mt-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-neutral-400">legenda</span>
          <br />
          {legenda}
        </p>
      )}

      {numerosPendentes.length > 0 && (
        <div className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Rode antes de postar</p>
          <ul className="mt-1 list-disc pl-4">
            {numerosPendentes.map(n => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}

      {autoCritica && (
        <p className="mt-4 text-sm text-neutral-600">
          <span className="text-xs uppercase tracking-wide text-neutral-400">
            ponto mais fraco
          </span>
          <br />
          {autoCritica}
        </p>
      )}
    </div>
  );
}
