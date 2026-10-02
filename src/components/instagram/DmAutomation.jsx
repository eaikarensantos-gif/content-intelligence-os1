import DmExecutionStatus from './DmExecutionStatus'
import { useState } from 'react'
import DmTriggerRules from './DmTriggerRules'
import DmFlows from './DmFlows'
import DmContacts from './DmContacts'

const TABS = [
  ['rules', 'DM'],
  ['flows', 'Fluxo'],
  ['contacts', 'Contatos'],
]

export default function DmAutomation() {
  const [tab, setTab] = useState('rules')

  return (
    <>
      <div className="px-6 pt-6">
        <DmExecutionStatus />
        <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">Uma regra ativa está habilitada para processar eventos. Isso não confirma entrega de mensagens. Confira os registros de execução e a conexão antes de usar em uma campanha.</p>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`text-xs px-4 py-1.5 rounded-md font-medium transition-all ${
                tab === id ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'rules' && <DmTriggerRules />}
      {tab === 'flows' && <DmFlows />}
      {tab === 'contacts' && <DmContacts />}
    </>
  )
}
