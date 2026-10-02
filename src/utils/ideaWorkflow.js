const CONTENT_FIELDS = ['title', 'description', 'script', 'caption', 'cta']

export function reviseIdea(idea, updates, now = new Date().toISOString()) {
  const changed = CONTENT_FIELDS.some(key => key in updates && (updates[key] ?? '') !== (idea[key] ?? ''))
  const history = Array.isArray(idea.revisions) ? idea.revisions : []
  const revision = Object.fromEntries(CONTENT_FIELDS.map(key => [key, idea[key] ?? '']))
  return { ...idea, ...updates, updated_at: now, revisions: changed ? [...history, { ...revision, saved_at: now }] : history }
}

export function matchingIdeas(ideas, title, excludeId) {
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()
  const key = normalize(title)
  return key ? ideas.filter(idea => idea.id !== excludeId && normalize(idea.title) === key) : []
}

export function productionTask(idea) {
  return { title: `Produzir: ${idea.title}`, idea_id: idea.id, description: idea.description || '', due_date: idea.scheduled_date || '', priority: idea.priority || 'medium', tags: ['Conteúdo'], status: 'todo' }
}
