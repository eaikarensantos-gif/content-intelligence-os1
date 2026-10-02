import { Link } from 'react-router-dom'
import useStore from '../../store/useStore'
import { matchingIdeas, productionTask } from '../../utils/ideaWorkflow'

export default function IdeaWorkflowPanel({ form, onRestore }) {
  const ideas = useStore(s => s.ideas)
  const tasks = useStore(s => s.tasks)
  const addTask = useStore(s => s.addTask)
  const updateIdea = useStore(s => s.updateIdea)
  const metrics = useStore(s => s.metrics)
  const saved = ideas.find(idea => idea.id === form.id)
  const related = tasks.filter(task => task.idea_id === form.id && form.id)
  const duplicates = matchingIdeas(ideas, form.title, form.id)
  const contentKeys = ['title', 'description', 'script', 'caption', 'cta']
  const dirty = saved && contentKeys.some(key => (form[key] || '') !== (saved[key] || ''))
  const approvalCurrent = saved?.approved_version && contentKeys.every(key => (saved[key] || '') === (saved.approved_version[key] || ''))
  const result = metrics.find(metric => form.metric_id && metric.id === form.metric_id)
  return <section className="rounded-xl border border-gray-200 p-3 space-y-3 text-xs">
    <h3 className="font-semibold text-gray-800">Produção e versões</h3>
    {saved ? <>
      <p>A tarefa usa a última versão salva da ideia. Mudanças de prazo e status são independentes.</p>
      {related.length ? <ul>{related.map(task => <li key={task.id}>{task.title} · {({ todo: 'A fazer', doing: 'Em andamento', in_progress: 'Em andamento', review: 'Em revisão', done: 'Concluída' })[task.status] || task.status}</li>)}</ul> : <button type="button" onClick={() => addTask(productionTask(saved))} className="text-orange-700 underline">Criar tarefa vinculada</button>}
      <Link to="/tasks" className="inline-block text-orange-700 underline">Abrir tarefas</Link>
      <div className="border-t pt-2">
        {saved.approved_version && <p>{approvalCurrent ? 'Texto salvo igual à versão aprovada' : 'Texto alterado após a aprovação'} · {new Date(saved.approved_version.approved_at).toLocaleString('pt-BR')}</p>}
        <button type="button" disabled={dirty || approvalCurrent} className="text-orange-700 underline disabled:opacity-50" onClick={() => updateIdea(saved.id, { approved_version: { ...Object.fromEntries(contentKeys.map(key => [key, saved[key] || ''])), approved_at: new Date().toISOString() } })}>Registrar aprovação do texto salvo</button>
        {dirty && <p>Salve as alterações antes de registrar a aprovação.</p>}
      </div>
      {result && <p>Resultado vinculado: {result.date || 'Data não informada'} · {result.platform || 'Plataforma não informada'} · {result.impressions ?? 'Não informado'} impressões. <Link to="/analytics" className="underline">Ver métricas</Link></p>}
    </> : <p>Salve a ideia para criar uma tarefa vinculada.</p>}
    {duplicates.length > 0 && <details className="text-amber-900"><summary>{duplicates.length} ideia(s) com o mesmo título. Comparar antes de salvar</summary>{duplicates.map(idea => <div key={idea.id} className="mt-2 whitespace-pre-wrap rounded bg-amber-50 p-2"><strong>{idea.title} · {idea.status}</strong><p>{idea.description || idea.script || 'Sem descrição'}</p></div>)}</details>}
    {!!saved?.revisions?.length && <details><summary>{saved.revisions.length} versão(ões) anterior(es)</summary>{[...saved.revisions].reverse().map((revision, index) => <details key={`${revision.saved_at}-${index}`} className="mt-2 border-t pt-2"><summary>{new Date(revision.saved_at).toLocaleString('pt-BR')} · {revision.title || 'Sem título'}</summary>{['description', 'script', 'caption', 'cta'].map(key => revision[key] && <p key={key} className="my-2 whitespace-pre-wrap">{revision[key]}</p>)}<button type="button" className="underline text-orange-700" onClick={() => onRestore(revision)}>Usar esta versão no formulário</button></details>)}</details>}
  </section>
}
