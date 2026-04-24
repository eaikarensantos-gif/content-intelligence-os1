import { useState } from 'react'
import { Brain, Plus, Trash2, CheckCircle2, Circle, Clock, User, ChevronDown, ChevronRight, X } from 'lucide-react'

const TASK_STATUS = {
  pending: { label: 'Pendente', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'Em andamento', icon: Clock, color: 'text-orange-500' },
  done: { label: 'Concluída', icon: CheckCircle2, color: 'text-green-500' },
}

const CONTACT_ROLES = ['Marca', 'Colaborador', 'Agência', 'Produtor', 'Editor', 'Outro']

function TaskItem({ task, onStatusChange, onDelete }) {
  const status = TASK_STATUS[task.status]
  const Icon = status.icon

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-orange-50 group">
      <button onClick={() => onStatusChange(task.id)} className={`shrink-0 ${status.color}`}>
        <Icon size={16} />
      </button>
      <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {task.title}
      </span>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
        task.status === 'done' ? 'bg-green-100 text-green-700' :
        task.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
        'bg-gray-100 text-gray-500'
      }`}>
        {status.label}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function ContactCard({ contact, onAddTask, onDeleteTask, onStatusChange, onDeleteContact }) {
  const [expanded, setExpanded] = useState(true)
  const [newTask, setNewTask] = useState('')

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    onAddTask(contact.id, newTask.trim())
    setNewTask('')
  }

  const done = contact.tasks.filter((t) => t.status === 'done').length
  const total = contact.tasks.length

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-50">
        <button onClick={() => setExpanded((v) => !v)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{contact.name}</div>
          <div className="text-[11px] text-gray-400">{contact.role}</div>
        </div>
        {total > 0 && (
          <div className="text-[11px] text-gray-400 shrink-0">
            {done}/{total} tarefas
          </div>
        )}
        <button
          onClick={() => onDeleteContact(contact.id)}
          className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-1">
          {contact.tasks.length === 0 && (
            <p className="text-xs text-gray-400 py-2 text-center">Nenhuma tarefa ainda</p>
          )}
          {contact.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={(id) => onStatusChange(contact.id, id)}
              onDelete={(id) => onDeleteTask(contact.id, id)}
            />
          ))}
          <form onSubmit={handleAddTask} className="flex items-center gap-2 pt-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1 text-sm border border-orange-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-gray-300"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

let nextId = 1
const genId = () => `cb-${nextId++}`

export default function ContactBrain() {
  const [contacts, setContacts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState(CONTACT_ROLES[0])

  const handleAddContact = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setContacts((prev) => [
      ...prev,
      { id: genId(), name: newName.trim(), role: newRole, tasks: [] },
    ])
    setNewName('')
    setNewRole(CONTACT_ROLES[0])
    setShowForm(false)
  }

  const handleDeleteContact = (contactId) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId))
  }

  const handleAddTask = (contactId, title) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, tasks: [...c.tasks, { id: genId(), title, status: 'pending' }] }
          : c
      )
    )
  }

  const handleDeleteTask = (contactId, taskId) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }
          : c
      )
    )
  }

  const handleStatusChange = (contactId, taskId) => {
    const cycle = { pending: 'in_progress', in_progress: 'done', done: 'pending' }
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? {
              ...c,
              tasks: c.tasks.map((t) =>
                t.id === taskId ? { ...t, status: cycle[t.status] } : t
              ),
            }
          : c
      )
    )
  }

  const totalTasks = contacts.reduce((s, c) => s + c.tasks.length, 0)
  const doneTasks = contacts.reduce((s, c) => s + c.tasks.filter((t) => t.status === 'done').length, 0)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contact Brain</h1>
            <p className="text-sm text-gray-400">Gerencie contatos e aloque tarefas</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={15} />
          Novo contato
        </button>
      </div>

      {/* Stats */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Contatos', value: contacts.length },
            { label: 'Tarefas', value: totalTasks },
            { label: 'Concluídas', value: doneTasks },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-orange-100 p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* New contact form */}
      {showForm && (
        <form
          onSubmit={handleAddContact}
          className="bg-white rounded-2xl border border-orange-200 p-4 mb-4 space-y-3 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-orange-500" />
            <span className="text-sm font-medium text-gray-700">Novo Contato</span>
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do contato"
            className="w-full text-sm border border-orange-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-gray-300"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full text-sm border border-orange-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-600"
          >
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Brain size={40} className="mx-auto mb-3 text-orange-200" />
          <p className="text-sm font-medium">Nenhum contato ainda</p>
          <p className="text-xs mt-1">Adicione contatos para alocar tarefas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onDeleteContact={handleDeleteContact}
            />
          ))}
        </div>
      )}
    </div>
  )
}
