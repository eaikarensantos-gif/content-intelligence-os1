import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, MoreVertical, Calendar, Zap, RefreshCw, BarChart2, GripVertical } from 'lucide-react'
import { useState } from 'react'
import useStore from '../../store/useStore'
import { PlatformBadge, PriorityBadge, FormatBadge } from '../common/Badge'
import IdeaForm from '../ideas/IdeaForm'

const COLUMNS = [
  { id: 'idea', label: 'Ideas', color: 'border-orange-200 bg-orange-50/60', dot: 'bg-orange-400', count_bg: 'bg-orange-100 text-orange-700' },
  { id: 'draft', label: 'Drafts', color: 'border-blue-200 bg-blue-50/60', dot: 'bg-blue-400', count_bg: 'bg-blue-100 text-blue-700' },
  { id: 'ready', label: 'Ready', color: 'border-emerald-200 bg-emerald-50/60', dot: 'bg-emerald-400', count_bg: 'bg-emerald-100 text-emerald-700' },
  { id: 'published', label: 'Published', color: 'border-green-200 bg-green-50/60', dot: 'bg-green-400', count_bg: 'bg-green-100 text-green-700' },
]

function MetricsModal({ open, ideaId, onClose }) {
  const addPost = useStore((s) => s.addPost)
  const addMetric = useStore((s) => s.addMetric)
  const ideas = useStore((s) => s.ideas)
  const idea = ideas.find((i) => i.id === ideaId)
  const [form, setForm] = useState({
    impressions: '', reach: '', likes: '', comments: '', shares: '', saves: '', link_clicks: '',
  })
  if (!open || !idea) return null
  const handleSubmit = (e) => {
    e.preventDefault()
    // Create post if no post_id
    let postId = idea.post_id
    if (!postId) {
      postId = `post-${Date.now()}`
      addPost({ id: postId, idea_id: ideaId, title: idea.title, platform: idea.platform, format: idea.format, status: 'published' })
    }
    addMetric({
      post_id: postId,
      platform: idea.platform,
      date: new Date().toISOString().split('T')[0],
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v) || 0])),
    })
    onClose()
  }
  const fields = [
    ['impressions', 'Impressions'], ['reach', 'Reach'], ['likes', 'Likes'],
    ['comments', 'Comments'], ['shares', 'Shares'], ['saves', 'Saves'], ['link_clicks', 'Link Clicks'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Register Metrics — {idea.title.slice(0, 40)}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {fields.map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input type="number" className="input" placeholder="0" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary text-xs" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary text-xs">Save Metrics</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function KanbanBoard() {
  const ideas = useStore((s) => s.ideas)
  const updateIdea = useStore((s) => s.updateIdea)
  const addIdea = useStore((s) => s.addIdea)
  const [newIdeaOpen, setNewIdeaOpen] = useState(false)
  const [metricsTarget, setMetricsTarget] = useState(null)

  const onDragEnd = ({ destination, draggableId }) => {
    if (!destination) return
    updateIdea(draggableId, { status: destination.droppableId })
  }

  const columnIdeas = (colId) => ideas.filter((i) => i.status === colId)

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-xs text-gray-500">{col.label}: {columnIdeas(col.id).length}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setNewIdeaOpen(true)} className="btn-primary text-xs">
          <Plus size={13} /> Add Idea
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4 min-h-[70vh]">
          {COLUMNS.map((col) => {
            const colIdeas = columnIdeas(col.id)
            return (
              <div key={col.id} className={`flex flex-col rounded-xl border ${col.color} overflow-hidden`}>
                {/* Column header */}
                <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200/80">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${col.count_bg}`}>
                    {colIdeas.length}
                  </span>
                </div>

                {/* Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/60' : ''}`}
                    >
                      {colIdeas.map((idea, index) => (
                        <Draggable key={idea.id} draggableId={idea.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white border rounded-xl p-3 space-y-2 transition-all ${
                                snapshot.isDragging
                                  ? 'border-orange-400 shadow-lg shadow-orange-200/50 rotate-1 scale-105'
                                  : 'border-gray-200 hover:border-orange-300'
                              }`}
                            >
                              {/* Drag handle + title */}
                              <div className="flex items-start gap-2">
                                <span {...provided.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
                                  <GripVertical size={13} />
                                </span>
                                <p className="text-xs font-medium text-gray-800 leading-snug flex-1 line-clamp-2">{idea.title}</p>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-1 ml-5">
                                <PlatformBadge platform={idea.platform} />
                                <FormatBadge format={idea.format} />
                              </div>

                              {/* Priority + date */}
                              <div className="flex items-center justify-between ml-5">
                                <PriorityBadge priority={idea.priority} />
                                {idea.scheduled_date && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Calendar size={10} />
                                    {idea.scheduled_date}
                                  </span>
                                )}
                              </div>

                              {/* Quick actions */}
                              <div className="flex items-center gap-1 ml-5 pt-1 border-t border-gray-100">
                                <button
                                  onClick={() => setMetricsTarget(idea.id)}
                                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors px-1.5 py-1 rounded hover:bg-orange-50"
                                >
                                  <BarChart2 size={10} /> Metrics
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {colIdeas.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-center">
                          <p className="text-[11px] text-gray-400">Drop cards here</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <IdeaForm
        open={newIdeaOpen}
        onClose={() => setNewIdeaOpen(false)}
        onSave={(data) => addIdea(data)}
      />

      <MetricsModal
        open={!!metricsTarget}
        ideaId={metricsTarget}
        onClose={() => setMetricsTarget(null)}
      />
    </div>
  )
}
