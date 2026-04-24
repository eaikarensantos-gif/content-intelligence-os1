import { useState } from 'react'
import { Search, X, Zap } from 'lucide-react'
import clsx from 'clsx'
import ReferenceSearch from './ReferenceSearch'
import ReferenceCard from './ReferenceCard'
import RemixEngine from './RemixEngine'

export default function ReferenceExplorer({ onSelectReference, onGenerateScript }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReferences, setSelectedReferences] = useState([])
  const [remixingReference, setRemixingReference] = useState(null)
  const [view, setView] = useState('search') // 'search' ou 'remix'

  const handleSelectReference = (reference) => {
    if (!selectedReferences.some(r => r.id === reference.id)) {
      setSelectedReferences([...selectedReferences, reference])
    }
    setRemixingReference(reference)
    setView('remix')
  }

  const handleRemoveReference = (id) => {
    setSelectedReferences(selectedReferences.filter(r => r.id !== id))
  }

  const handleTranscribe = (reference) => {
    setRemixingReference(reference)
    setView('remix')
  }

  const handleGenerateScript = (script) => {
    onGenerateScript(script)
    setIsOpen(false)
    setSelectedReferences([])
    setRemixingReference(null)
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40"
        title="Explorador de Referências"
      >
        <Zap size={20} />
      </button>

      {/* Modal backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => !remixingReference && setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed right-0 top-0 h-screen w-96 bg-white shadow-2xl transition-transform duration-300 z-50',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-orange-600" />
            <div>
              <h2 className="font-bold text-gray-900">Explorar Referências</h2>
              <p className="text-xs text-gray-600">Cross-Platform Universal Search</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false)
              setRemixingReference(null)
              setView('search')
            }}
            className="p-2 hover:bg-orange-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {view === 'search' ? (
          <>
            {/* Search component */}
            <ReferenceSearch
              onSelect={handleSelectReference}
              selectedReferences={selectedReferences}
            />

            {/* Selected references preview */}
            {selectedReferences.length > 0 && (
              <div className="border-t p-3 bg-orange-50">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  SELECIONADAS ({selectedReferences.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedReferences.map((ref) => (
                    <ReferenceCard
                      key={ref.id}
                      reference={ref}
                      onRemove={handleRemoveReference}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy'
                        e.dataTransfer.setData('reference', JSON.stringify(ref))
                      }}
                      onTranscribe={handleTranscribe}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Remix engine */
          remixingReference && (
            <RemixEngine
              reference={remixingReference}
              onGenerateScript={handleGenerateScript}
              onClose={() => {
                setView('search')
                setRemixingReference(null)
              }}
            />
          )
        )}
      </div>
    </>
  )
}
