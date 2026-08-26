import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Loader2, RefreshCw, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchGoogleCalendarEvents, getGoogleConnection } from '../../lib/googleCalendarAuth'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const isoDay = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthRange(month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(start)
  gridStart.setDate(1 - start.getDay())
  const gridEnd = new Date(gridStart)
  gridEnd.setDate(gridStart.getDate() + 42)
  return { gridStart, gridEnd }
}

function eventDay(event) { return (event.start || '').slice(0, 10) }
function eventTime(event) {
  if (event.allDay || !event.start?.includes('T')) return 'Dia todo'
  return new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function TaskCalendar({ tasks, onEditTask }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const connected = Boolean(getGoogleConnection())
  const range = useMemo(() => monthRange(month), [month])

  const load = async () => {
    if (!connected) return
    setLoading(true); setError('')
    try { setEvents(await fetchGoogleCalendarEvents(range.gridStart.toISOString(), range.gridEnd.toISOString())) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [month]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => {
    const date = new Date(range.gridStart)
    date.setDate(range.gridStart.getDate() + index)
    return date
  }), [range])
  const today = isoDay(new Date())

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Mês anterior"><ChevronLeft size={16} /></button>
          <h3 className="text-sm font-semibold text-gray-800 min-w-[150px] text-center capitalize">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Próximo mês"><ChevronRight size={16} /></button>
          <button onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Hoje</button>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <button onClick={load} disabled={loading} className="btn-secondary text-xs">{loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Atualizar agenda</button>
          ) : (
            <Link to="/settings" className="btn-secondary text-xs"><CalendarDays size={12} /> Conectar Google Calendar</Link>
          )}
        </div>
      </div>
      {error && <div className="px-4 py-2 text-[11px] text-red-600 bg-red-50 border-b border-red-100">{error} <Link to="/settings" className="underline"><Settings size={10} className="inline" /> Configurações</Link></div>}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {WEEKDAYS.map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-gray-400">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const key = isoDay(date)
          const dayTasks = tasks.filter((task) => task.due_date === key)
          const dayEvents = events.filter((event) => eventDay(event) === key)
          const outside = date.getMonth() !== month.getMonth()
          return (
            <div key={key} className={`min-h-[112px] border-r border-b border-gray-100 p-1.5 ${outside ? 'bg-gray-50/70' : 'bg-white'}`}>
              <div className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-full mb-1 ${key === today ? 'bg-orange-500 text-white font-bold' : outside ? 'text-gray-300' : 'text-gray-500'}`}>{date.getDate()}</div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <a key={`g-${event.id}`} href={event.htmlLink || undefined} target="_blank" rel="noopener noreferrer" title={`${event.title} · ${eventTime(event)}`} className="block rounded-md px-1.5 py-1 text-[10px] leading-tight bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 truncate">
                    <span className="font-medium">{eventTime(event)}</span> {event.title} {event.htmlLink && <ExternalLink size={8} className="inline" />}
                  </a>
                ))}
                {dayTasks.slice(0, 3).map((task) => (
                  <button key={`t-${task.id}`} onClick={() => onEditTask(task)} title={task.title} className={`block w-full text-left rounded-md px-1.5 py-1 text-[10px] leading-tight border truncate ${task.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 line-through' : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'}`}>
                    {task.title}
                  </button>
                ))}
                {dayEvents.length + dayTasks.length > 6 && <div className="text-[9px] text-gray-400 pl-1">+{dayEvents.length + dayTasks.length - 6} itens</div>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-2.5 flex items-center gap-4 text-[10px] text-gray-500 bg-gray-50">
        <span><i className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" /> Tarefas</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" /> Google Calendar</span>
      </div>
    </div>
  )
}
