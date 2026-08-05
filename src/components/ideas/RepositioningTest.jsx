import { useState, useMemo } from 'react'
import {
  CalendarRange, ListChecks, Target, BarChart3, AlertTriangle, Check,
  Megaphone, Clock, ChevronRight, Trash2, Info, Link2, Clapperboard, RefreshCw,
} from 'lucide-react'
import useStore from '../../store/useStore'
import Modal from '../common/Modal'
import {
  CONTAINERS, PILLARS, SERIES, TEST_STATUSES, TEST_STATUS_ORDER, RESULT_FIELDS, BASELINE,
  REPOSITIONING_TAG, BACKLOG_TAG, buildRepositioningIdeas, buildBacklogIdeas,
  validateRepositioningPlan, nextMonday, isMonday, toISO, measuredValue, seriesRetention,
  decisionWindow, revisionPatches, FIELD_LABELS_PT,
} from '../../data/repositioningTest'

const SUBTABS = [
  { id: 'semana',    label: 'Semana',      icon: Target },
  { id: 'calendario', label: '6 semanas',  icon: CalendarRange },
  { id: 'fila',      label: 'Fila',        icon: ListChecks },
  { id: 'medicao',   label: 'Medição',     icon: BarChart3 },
]

const fmtDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'

const fmtDateLong = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'

const daysBetween = (fromIso, toIso) =>
  Math.round((new Date(`${toIso}T12:00:00`) - new Date(`${fromIso}T12:00:00`)) / 86400000)

const num = (v) => (v === '' || v == null ? null : Number(v))

// ─── Chips reutilizados ──────────────────────────────────────────────────────

function PieceId({ id }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[26px] h-5 px-1.5 rounded-md bg-gray-900 text-white text-[10px] font-black tracking-wide">
      {id}
    </span>
  )
}

function PillarChip({ pillar }) {
  const p = PILLARS[pillar] || PILLARS['a definir']
  return <span className={`chip border text-[10px] ${p.chip}`}>{p.label}</span>
}

function TestStatusChip({ status }) {
  const s = TEST_STATUSES[status] || TEST_STATUSES['a produzir']
  return <span className={`chip border text-[10px] ${s.chip}`}>{s.label}</span>
}

function SeriesChip({ piece, compact }) {
  if (!piece.series) return null
  const s = SERIES[piece.series]
  return (
    <span
      className={`chip border text-[10px] ${s.chip}`}
      title={piece.series_role && piece.series_role !== 'a definir' ? `${s.label} como ${piece.series_role}` : s.label}
    >
      <Clapperboard size={9} />
      {compact ? `${s.label} ${piece.episode}` : `${s.label} · ep. ${piece.episode}`}
      {piece.series_role && piece.series_role !== 'a definir' && !compact && (
        <span className="opacity-60"> · {piece.series_role}</span>
      )}
    </span>
  )
}

function BridgeChip({ piece }) {
  if (!piece.bridge_with) return null
  return (
    <span className="chip border text-[10px] bg-sky-100 text-sky-700 border-sky-200" title="Continua o reel da mesma semana — citar no primeiro slide">
      <Link2 size={9} /> Ponte com {piece.bridge_with}
    </span>
  )
}

function HolidayChip({ piece }) {
  if (!piece.holiday_shift) return null
  return (
    <span
      className="chip border text-[10px] bg-yellow-100 text-yellow-800 border-yellow-200"
      title={`${fmtDate(piece.holiday_shift.from)} é feriado (${piece.holiday_shift.reason}) — publicação movida para não contaminar a leitura`}
    >
      <CalendarRange size={9} /> movida do feriado
    </span>
  )
}

/** Nas peças pendentes, mostra que dado vai existir no prazo de decisão. */
function DecisionNote({ piece, pieces }) {
  const win = decisionWindow(piece, pieces)
  if (!win) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-1">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Decidir até {fmtDateLong(win.deadline)}
      </p>
      {piece.decision_rule && (
        <p className="text-[11px] text-gray-600 leading-relaxed">{piece.decision_rule}</p>
      )}
      <p className="text-[10px] text-gray-500">
        {win.completo.length > 0
          ? <>Com 14 dias fechados até lá: <span className="font-semibold text-gray-700">{win.completo.join(', ')}</span></>
          : 'Nenhuma referência terá 14 dias fechados até o prazo.'}
        {win.parcial.length > 0 && (
          <> · só com 72h: <span className="font-semibold text-amber-700">{win.parcial.join(', ')}</span></>
        )}
      </p>
    </div>
  )
}

function CampaignChip() {
  return (
    <span className="chip border text-[10px] bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" title="Uso duplo — pode virar entrega Samsung">
      <Megaphone size={9} /> Campanha
    </span>
  )
}

function StatusSelect({ idea, onChange }) {
  return (
    <select
      className="select w-auto text-[11px] py-1"
      value={idea.test_status || 'a produzir'}
      onChange={(e) => onChange(idea, e.target.value)}
      onClick={(e) => e.stopPropagation()}
    >
      {TEST_STATUS_ORDER.map((s) => (
        <option key={s} value={s}>{TEST_STATUSES[s].label}</option>
      ))}
    </select>
  )
}

// ─── Tela de carga (DATA_INICIO) ─────────────────────────────────────────────

function LoadPanel({ onLoad }) {
  const [dataInicio, setDataInicio] = useState(nextMonday())
  const preview = useMemo(
    () => (isMonday(dataInicio) ? buildRepositioningIdeas(dataInicio) : []),
    [dataInicio]
  )
  const errors = useMemo(
    () => (preview.length ? validateRepositioningPlan(preview) : []),
    [preview]
  )
  const valid = isMonday(dataInicio) && errors.length === 0

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Teste de reposicionamento · 6 semanas</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-2xl">
            18 peças em 3 slots por semana, com formato, data, prazo de produção e alvo já definidos pelo
            relatório de 90 dias. Nada é gerado por IA aqui — o calendário entra como está. Defina a segunda-feira
            da semana 1 e todas as datas são derivadas dela. Junto entram as 2 pautas de fora do teste,
            sem data, para depois da semana 6.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">
              DATA_INÍCIO — segunda-feira da semana 1
            </label>
            <input
              type="date"
              className="input text-sm w-auto"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <button
            onClick={() => onLoad(preview, dataInicio)}
            disabled={!valid}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} /> Carregar as 18 peças
          </button>
          <button
            onClick={() => setDataInicio(nextMonday())}
            className="btn-ghost text-xs"
          >
            Próxima segunda
          </button>
        </div>

        {!isMonday(dataInicio) && (
          <p className="text-[11px] text-red-600 flex items-center gap-1">
            <AlertTriangle size={11} /> A data de início precisa ser uma segunda-feira. Todas as outras datas dependem dela.
          </p>
        )}

        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-1">
            <p className="text-[11px] font-semibold text-red-700">Verificação falhou — nada será escrito:</p>
            {errors.map((e) => <p key={e} className="text-[11px] text-red-600">· {e}</p>)}
          </div>
        )}

        {valid && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              <span className="font-semibold">Verificação ok:</span> 18 registros, 3 por semana, sem data duplicada,
              todo prazo de produção anterior à publicação, nenhuma publicação depois das 21h,
              série Wilson com 6 episódios em sequência, B3 e B4 apontando para A3 e A4.
              Primeira peça em {fmtDateLong(preview[0].scheduled_date)}, última em {fmtDateLong(preview[17].scheduled_date)}.
            </p>
          </div>
        )}
      </div>

      {/* Séries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Object.values(SERIES).map((s) => (
          <div key={s.id} className="card p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`chip border text-[10px] ${s.chip}`}><Clapperboard size={9} /> {s.label}</span>
              <span className="text-[10px] text-gray-400">{s.episodes} episódios</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Object.values(CONTAINERS).map((c) => (
          <div key={c.id} className="card p-4 space-y-2">
            <p className="text-xs font-bold text-gray-900">{c.label}</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">{c.spec}</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">Prova: {c.prova}</p>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {c.dayLabel}, {c.time} · alvo por peça
              </p>
              <div className="flex flex-wrap gap-1">
                {c.targets.map((t) => (
                  <span key={t.key} className="chip border text-[10px] bg-gray-100 text-gray-600 border-gray-200">
                    {t.label} {t.kind === 'pct' ? `${String(t.target).replace('.', ',')}%+` : `${t.target}+`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── View 1 · Semana ─────────────────────────────────────────────────────────

function WeekView({ pieces, today, onStatusChange, onOpen }) {
  const weeks = [...new Set(pieces.map((p) => p.test_week))].sort((a, b) => a - b)
  const currentWeek =
    pieces.find((p) => p.produce_by >= today || p.scheduled_date >= today)?.test_week ?? weeks[weeks.length - 1]
  const [week, setWeek] = useState(currentWeek)

  const list = pieces
    .filter((p) => p.test_week === week)
    .sort((a, b) => a.produce_by.localeCompare(b.produce_by))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-gray-400 mr-1">Semana:</span>
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`text-xs font-semibold w-8 h-8 rounded-lg border transition-all ${
              week === w ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
            }`}
          >
            {w}
          </button>
        ))}
        {week === currentWeek && <span className="text-[10px] text-orange-600 font-medium ml-1">semana corrente</span>}
      </div>

      <div className="space-y-2">
        {list.map((p) => {
          const dueToday = p.produce_by === today
          const late = p.produce_by < today && ['a produzir', 'a definir'].includes(p.test_status)
          const c = CONTAINERS[p.container]
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 space-y-3 transition-all ${
                dueToday ? 'border-orange-400 bg-orange-50/60 shadow-sm shadow-orange-100'
                : late ? 'border-red-200 bg-red-50/40'
                : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-2 flex-wrap">
                <PieceId id={p.internal_id} />
                {dueToday && <span className="text-[9px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded-full">PRODUZIR HOJE</span>}
                {late && <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">ATRASADO</span>}
                <SeriesChip piece={p} />
                <BridgeChip piece={p} />
                <HolidayChip piece={p} />
                <PillarChip pillar={p.pillar} />
                {p.campaign_ready && <CampaignChip />}
                <div className="ml-auto">
                  <StatusSelect idea={p} onChange={onStatusChange} />
                </div>
              </div>

              <button onClick={() => onOpen(p)} className="text-left w-full">
                <p className="text-sm font-semibold text-gray-900 leading-snug hover:text-orange-600 transition-colors">
                  {p.angle}
                  {p.angle_pending && <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">ângulo pendente</span>}
                </p>
              </button>

              <div className="flex items-center gap-4 flex-wrap text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-gray-400" />
                  Produzir até <span className="font-semibold text-gray-700">{fmtDateLong(p.produce_by)}</span>
                </span>
                <ChevronRight size={11} className="text-gray-300" />
                <span>
                  Publicar <span className="font-semibold text-gray-700">{fmtDateLong(p.scheduled_date)}, {p.publish_time}</span>
                </span>
                <span className="text-gray-400">· {c.short}{p.container_variant ? ` (${p.container_variant})` : ''}</span>
              </div>

              <DecisionNote piece={p} pieces={pieces} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── View 2 · Calendário das 6 semanas ───────────────────────────────────────

function SixWeekGrid({ pieces, today, onOpen }) {
  const weeks = [...new Set(pieces.map((p) => p.test_week))].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-500">
        <span className="uppercase tracking-wide font-semibold text-gray-400">Pilar:</span>
        {Object.entries(PILLARS).map(([key, p]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${p.dot}`} /> {p.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[60px_repeat(3,1fr)] gap-2 mb-2">
            <div />
            {['A', 'B', 'C'].map((slot) => (
              <div key={slot} className="text-center">
                <p className="text-[11px] font-bold text-gray-700">Slot {slot} · {CONTAINERS[slot].short}</p>
                <p className="text-[10px] text-gray-400">{CONTAINERS[slot].dayLabel}, {CONTAINERS[slot].time}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {weeks.map((w) => (
              <div key={w} className="grid grid-cols-[60px_repeat(3,1fr)] gap-2">
                <div className="flex items-center justify-center">
                  <span className="text-[11px] font-bold text-gray-400">Sem {w}</span>
                </div>
                {['A', 'B', 'C'].map((slot) => {
                  const p = pieces.find((i) => i.test_week === w && i.test_slot === slot)
                  if (!p) return <div key={slot} className="rounded-xl border border-dashed border-gray-200 min-h-[92px]" />
                  const pil = PILLARS[p.pillar] || PILLARS['a definir']
                  const isToday = p.scheduled_date === today
                  return (
                    <button
                      key={slot}
                      onClick={() => onOpen(p)}
                      className={`text-left rounded-xl border p-3 space-y-1.5 min-h-[92px] transition-all hover:shadow-sm ${pil.cell} ${isToday ? 'ring-2 ring-orange-400' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <PieceId id={p.internal_id} />
                        <span className="text-[10px] text-gray-500">{fmtDate(p.scheduled_date)} · {p.publish_time}</span>
                        {p.holiday_shift && (
                          <span title={`movida do feriado (${p.holiday_shift.reason})`} className="text-[9px] text-yellow-700 font-bold">★</span>
                        )}
                        {p.campaign_ready && <Megaphone size={10} className="text-fuchsia-600" />}
                      </div>
                      {p.series && <SeriesChip piece={p} compact />}
                      <p className="text-[11px] text-gray-800 leading-snug line-clamp-3">
                        {p.angle_pending ? <span className="text-gray-400 italic">{p.angle}</span> : p.angle}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <TestStatusChip status={p.test_status} />
                        {p.bridge_with && (
                          <span className="chip border text-[9px] bg-sky-100 text-sky-700 border-sky-200">
                            <Link2 size={8} /> {p.bridge_with}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── View 3 · Fila de produção ───────────────────────────────────────────────

function ProductionQueue({ pieces, today, onStatusChange, onOpen }) {
  const queue = pieces
    .filter((p) => p.test_status === 'a produzir')
    .sort((a, b) => a.produce_by.localeCompare(b.produce_by))

  const pending = pieces.filter((p) => p.test_status === 'a definir')

  if (queue.length === 0 && pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ListChecks size={26} className="text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium text-sm">Nada na fila de produção</p>
        <p className="text-gray-400 text-xs mt-1">Todas as peças já estão produzidas, publicadas ou medidas</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-[11px] text-gray-500">{queue.length} peça{queue.length === 1 ? '' : 's'} a produzir, ordenadas por prazo.</p>
        {queue.map((p) => {
          const days = daysBetween(today, p.produce_by)
          const tone =
            days < 0 ? 'bg-red-100 text-red-700 border-red-200'
            : days === 0 ? 'bg-orange-100 text-orange-700 border-orange-200'
            : days <= 2 ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-gray-100 text-gray-600 border-gray-200'
          return (
            <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-orange-300 transition-all">
              <PieceId id={p.internal_id} />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(p)}>
                <p className="text-xs font-medium text-gray-800 truncate">{p.angle}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <SeriesChip piece={p} compact />
                  <BridgeChip piece={p} />
                  <PillarChip pillar={p.pillar} />
                  <span className="text-[10px] text-gray-400">
                    {CONTAINERS[p.container].short} · publica {fmtDate(p.scheduled_date)} {p.publish_time}
                  </span>
                  {p.campaign_ready && <CampaignChip />}
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border shrink-0 ${tone}`}>
                {days < 0 ? `${Math.abs(days)}d atrasado` : days === 0 ? 'hoje' : `${days}d`}
              </span>
              <StatusSelect idea={p} onChange={onStatusChange} />
            </div>
          )
        })}
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2">
          <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
            <Info size={12} className="text-gray-400" />
            {pending.length} slots reservados — não produzir antes da revisão da semana 4
          </p>
          {pending.map((p) => (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <PieceId id={p.internal_id} />
                <span className="text-[11px] text-gray-500 italic">{p.angle}</span>
                <span className="text-[10px] text-gray-400">· publica {fmtDate(p.scheduled_date)}</span>
                <HolidayChip piece={p} />
              </div>
              <DecisionNote piece={p} pieces={pieces} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── View 4 · Medição ────────────────────────────────────────────────────────

function ResultCell({ target, result }) {
  const value = measuredValue(target, result)
  if (value == null) return <span className="text-[11px] text-gray-300">—</span>
  const hit = value >= target.target
  const shown = target.kind === 'pct' ? `${value.toFixed(1).replace('.', ',')}%` : value.toLocaleString('pt-BR')
  return (
    <span className={`text-[11px] font-semibold ${hit ? 'text-emerald-600' : 'text-red-500'}`}>
      {shown}
      <span className="text-gray-300 font-normal"> / {target.kind === 'pct' ? `${String(target.target).replace('.', ',')}%` : target.target}</span>
    </span>
  )
}

function WilsonRetention({ pieces }) {
  const rows = seriesRetention(pieces, 'Wilson')
  const serie = SERIES.Wilson
  const hasData = rows.some((r) => r.alcance != null)

  return (
    <div className="card p-4">
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <p className="text-xs font-bold text-gray-900">Série {serie.label} · retenção de alcance</p>
        <p className="text-[10px] text-gray-400">
          alvo: cada episódio retém {serie.retentionTarget}%+ do alcance do anterior
        </p>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
        Se cada episódio cai pela metade sem o anterior sustentar o seguinte, a série não está
        serializando — virou reel avulso com nome.
      </p>
      <div className="overflow-x-auto">
        <div className="flex items-stretch gap-2 min-w-[560px]">
          {rows.map((r, idx) => {
            const hit = r.retention != null && r.retention >= r.target
            return (
              <div key={r.id} className="flex items-stretch gap-2 flex-1">
                {idx > 0 && (
                  <div className="flex flex-col items-center justify-center px-1">
                    <ChevronRight size={12} className="text-gray-300" />
                    <span className={`text-[10px] font-bold ${
                      r.retention == null ? 'text-gray-300' : hit ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {r.retention == null ? '—' : `${Math.round(r.retention)}%`}
                    </span>
                  </div>
                )}
                <div className="flex-1 rounded-xl border border-gray-200 p-2.5 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">ep. {r.episode}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {r.alcance != null ? r.alcance.toLocaleString('pt-BR') : '—'}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{r.role || 'a definir'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {!hasData && (
        <p className="text-[10px] text-gray-400 mt-2">
          Preencha o alcance de 72h dos episódios para acompanhar a retenção.
        </p>
      )}
    </div>
  )
}

function MeasurementView({ pieces, onOpenResults }) {
  const published = pieces
    .filter((p) => ['publicado', 'medido'].includes(p.test_status))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  return (
    <div className="space-y-5">
      {/* Linha de base */}
      <div className="card p-4">
        <p className="text-xs font-bold text-gray-900 mb-3">Linha de base do perfil</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Métrica</th>
                <th className="py-2 font-semibold text-right">Base</th>
                <th className="py-2 font-semibold text-right">Alvo em 6 semanas</th>
              </tr>
            </thead>
            <tbody>
              {BASELINE.map((b) => (
                <tr key={b.metric} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-xs text-gray-700">{b.metric}</td>
                  <td className="py-2 text-xs text-gray-500 text-right">{b.base}</td>
                  <td className="py-2 text-xs font-semibold text-gray-900 text-right">{b.goal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retenção da série Wilson */}
      <WilsonRetention pieces={pieces} />

      {/* Peças publicadas */}
      {published.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <BarChart3 size={26} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium text-sm">Nenhuma peça publicada ainda</p>
          <p className="text-gray-400 text-xs mt-1">Marque uma peça como publicada para lançar os resultados de 72h e 14 dias</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-200">
                <th className="py-2 font-semibold">Peça</th>
                <th className="py-2 font-semibold">Publicada</th>
                <th className="py-2 font-semibold">Container</th>
                <th className="py-2 font-semibold">Resultado 72h vs alvo</th>
                <th className="py-2 font-semibold">Resultado 14d vs alvo</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {published.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 align-top">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <PieceId id={p.internal_id} />
                      {p.series && <SeriesChip piece={p} compact />}
                      {p.campaign_ready && <Megaphone size={10} className="text-fuchsia-600" />}
                    </div>
                    <p className="text-[11px] text-gray-700 max-w-[220px] line-clamp-2">{p.angle}</p>
                  </td>
                  <td className="py-3 pr-3 text-[11px] text-gray-500 whitespace-nowrap">
                    {fmtDate(p.scheduled_date)} {p.publish_time}
                  </td>
                  <td className="py-3 pr-3 text-[11px] text-gray-500">{CONTAINERS[p.container].short}</td>
                  {['result_72h', 'result_14d'].map((field) => (
                    <td key={field} className="py-3 pr-3">
                      <div className="space-y-1">
                        {CONTAINERS[p.container].targets.map((t) => (
                          <div key={t.key} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 w-[110px] shrink-0">{t.label}</span>
                            <ResultCell target={t} result={p[field]} />
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                  <td className="py-3">
                    <button onClick={() => onOpenResults(p)} className="btn-ghost text-[11px] whitespace-nowrap">
                      Lançar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Revisão do calendário carregado ─────────────────────────────────────────
// A especificação mudou depois que as peças foram gravadas. Em vez de recarregar
// tudo (o que apagaria status e resultados), a revisão atualiza só os campos de
// especificação — e mostra antes o que vai mudar.

function RevisionBanner({ patches, onApply }) {
  const [open, setOpen] = useState(false)
  if (!patches.length) return null

  const campos = [...new Set(patches.flatMap((p) => p.changed))]
    .map((c) => FIELD_LABELS_PT[c] || c)

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-2">
      <div className="flex items-start gap-2 flex-wrap">
        <RefreshCw size={13} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-blue-800">
            {patches.length} peça{patches.length > 1 ? 's' : ''} desatualizada{patches.length > 1 ? 's' : ''} em relação ao calendário revisado
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">
            Muda {campos.join(', ')}. Status, resultados e ordem de criação ficam como estão.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setOpen((o) => !o)} className="text-[11px] text-blue-600 hover:underline">
            {open ? 'Ocultar' : 'Ver o que muda'}
          </button>
          <button onClick={onApply} className="btn-primary text-[11px] py-1 px-2.5">
            <Check size={11} /> Aplicar
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-1 pt-1 border-t border-blue-200/60">
          {patches.map((p) => (
            <p key={p.internal_id} className="text-[10px] text-blue-700 leading-relaxed">
              <span className="font-bold">{p.internal_id}</span>
              {' — '}
              {p.changed.map((c) => FIELD_LABELS_PT[c] || c).join(', ')}
              {p.patch.scheduled_date && (
                <span className="text-blue-500"> · publica {fmtDate(p.patch.scheduled_date)}</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Banco de pautas fora do teste ───────────────────────────────────────────

function BacklogPanel({ items, onOpen }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2">
      <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
        <Info size={12} className="text-gray-400" />
        Banco de pautas fora do teste — sem data, para depois da semana 6
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((i) => (
          <button
            key={i.id}
            onClick={() => onOpen(i)}
            className="text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-all"
          >
            <p className="text-xs font-semibold text-gray-800">{i.title}</p>
            <p className="text-[10px] text-gray-500 leading-relaxed mt-1 line-clamp-3">{i.backlog_note}</p>
            {i.container && (
              <span className="chip border text-[10px] bg-gray-100 text-gray-600 border-gray-200 mt-2">
                Container {i.container}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Modal de lançamento de resultados ───────────────────────────────────────

function ResultsModal({ piece, onClose, onSave }) {
  const [r72, setR72] = useState(piece?.result_72h || {})
  const [r14, setR14] = useState(piece?.result_14d || {})
  if (!piece) return null

  return (
    <Modal open={!!piece} onClose={onClose} title={`Resultados — ${piece.internal_id}`} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <p className="text-xs text-gray-500 leading-relaxed">{piece.angle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'Resultado 72h', value: r72, set: setR72 },
            { label: 'Resultado 14 dias', value: r14, set: setR14 },
          ].map(({ label, value, set }) => (
            <div key={label} className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              {RESULT_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="text-[11px] text-gray-500 flex-1">{f.label}</label>
                  <input
                    type="number"
                    className="input text-xs w-24 py-1"
                    value={value[f.key] ?? ''}
                    onChange={(e) => set((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Alvo do container</p>
          <div className="flex flex-wrap gap-1.5">
            {CONTAINERS[piece.container].targets.map((t) => (
              <span key={t.key} className="chip border text-[10px] bg-gray-100 text-gray-600 border-gray-200">
                {t.label} {t.kind === 'pct' ? `${String(t.target).replace('.', ',')}%+` : `${t.target}+`}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
          <button
            onClick={() => onSave(piece, { result_72h: r72, result_14d: r14 })}
            className="btn-primary text-xs"
          >
            <Check size={13} /> Salvar resultados
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function RepositioningTest({ onOpenIdea }) {
  const ideas       = useStore((s) => s.ideas)
  const importIdeas = useStore((s) => s.importIdeas)
  const updateIdea  = useStore((s) => s.updateIdea)
  const deleteIdea  = useStore((s) => s.deleteIdea)

  const [sub, setSub] = useState('semana')
  const [resultsTarget, setResultsTarget] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const today = toISO(new Date())

  const pieces = useMemo(
    () => ideas
      .filter((i) => (i.tags || []).includes(REPOSITIONING_TAG))
      .sort((a, b) => (a.internal_id || '').localeCompare(b.internal_id || '')),
    [ideas]
  )

  const backlog = useMemo(
    () => ideas.filter((i) => (i.tags || []).includes(BACKLOG_TAG)),
    [ideas]
  )

  const handleLoad = (built) => {
    const errors = validateRepositioningPlan(built)
    if (errors.length) { setLoadError(errors); return }
    setLoadError(null)
    // As 18 peças do calendário + as pautas de fora do teste, essas sem data.
    importIdeas([...built, ...buildBacklogIdeas()])
    setSub('calendario')
  }

  const handleStatusChange = (piece, testStatus) => {
    updateIdea(piece.id, {
      test_status: testStatus,
      status: TEST_STATUSES[testStatus].appStatus,
    })
  }

  const handleSaveResults = (piece, updates) => {
    const hasAny = Object.values(updates.result_72h || {}).some((v) => num(v) != null)
      || Object.values(updates.result_14d || {}).some((v) => num(v) != null)
    updateIdea(piece.id, {
      ...updates,
      ...(hasAny && piece.test_status === 'publicado'
        ? { test_status: 'medido', status: TEST_STATUSES['medido'].appStatus }
        : {}),
    })
    setResultsTarget(null)
  }

  const patches = useMemo(() => revisionPatches(pieces), [pieces])

  const handleApplyRevision = () => {
    patches.forEach(({ id, patch }) => updateIdea(id, patch))
  }

  const handleClear = () => {
    ;[...pieces, ...backlog].forEach((p) => deleteIdea(p.id))
    setConfirmClear(false)
  }

  if (pieces.length === 0) {
    return (
      <div className="space-y-4">
        {loadError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-1">
            <p className="text-[11px] font-semibold text-red-700">Nada foi escrito — verificação falhou:</p>
            {loadError.map((e) => <p key={e} className="text-[11px] text-red-600">· {e}</p>)}
          </div>
        )}
        <LoadPanel onLoad={handleLoad} />
      </div>
    )
  }

  const counts = TEST_STATUS_ORDER.reduce((acc, s) => {
    const n = pieces.filter((p) => p.test_status === s).length
    return n ? [...acc, { status: s, n }] : acc
  }, [])

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {SUBTABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSub(id)}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                sub === id ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {counts.map(({ status, n }) => (
            <span key={status} className={`chip border text-[10px] ${TEST_STATUSES[status].chip}`}>
              {n} {TEST_STATUSES[status].label.toLowerCase()}
            </span>
          ))}
          {confirmClear ? (
            <span className="flex items-center gap-2 text-[11px]">
              <button onClick={handleClear} className="text-red-600 font-semibold hover:text-red-800">Confirmar</button>
              <button onClick={() => setConfirmClear(false)} className="text-gray-400 hover:text-gray-600">Cancelar</button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              title="Remover as 18 peças do teste"
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <RevisionBanner patches={patches} onApply={handleApplyRevision} />

      {sub === 'semana'     && <WeekView pieces={pieces} today={today} onStatusChange={handleStatusChange} onOpen={onOpenIdea} />}
      {sub === 'calendario' && <SixWeekGrid pieces={pieces} today={today} onOpen={onOpenIdea} />}
      {sub === 'calendario' && backlog.length > 0 && <BacklogPanel items={backlog} onOpen={onOpenIdea} />}
      {sub === 'fila'       && <ProductionQueue pieces={pieces} today={today} onStatusChange={handleStatusChange} onOpen={onOpenIdea} />}
      {sub === 'medicao'    && <MeasurementView pieces={pieces} onOpenResults={setResultsTarget} />}

      <ResultsModal key={resultsTarget?.id || 'none'} piece={resultsTarget} onClose={() => setResultsTarget(null)} onSave={handleSaveResults} />
    </div>
  )
}
