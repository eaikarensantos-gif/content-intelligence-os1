import { useState } from 'react'
import { FileText, BarChart2 } from 'lucide-react'
import clsx from 'clsx'
import ClientReports from './ClientReports'
import DynamicMetricsReport from './DynamicMetricsReport'

const TABS = [
  { id: 'client', label: 'Relatório de Cliente', icon: FileText },
  { id: 'metrics', label: 'Métricas Dinâmicas', icon: BarChart2 },
]

export default function ReportsPage() {
  const [tab, setTab] = useState('client')

  return (
    <div className="animate-fade-in">
      <div className="px-6 pt-4 border-b border-gray-200 bg-white flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
              tab === id
                ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      {tab === 'client' ? <ClientReports /> : <DynamicMetricsReport />}
    </div>
  )
}
