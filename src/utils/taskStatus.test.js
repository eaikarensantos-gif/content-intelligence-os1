import { describe, it, expect } from 'vitest'
import { taskStatus } from './taskStatus'

describe('estados de tarefas compartilhados', () => {
  it('conta tarefas atuais e legadas na mesma etapa sem misturar revisão', () => {
    const statuses = ['doing', 'in_progress', 'review', 'todo', 'done']
    expect(statuses.filter(status => taskStatus(status) === 'doing')).toHaveLength(2)
    expect(statuses.filter(status => taskStatus(status) === 'review')).toHaveLength(1)
    expect(taskStatus('blocked')).toBe('blocked')
  })
})
