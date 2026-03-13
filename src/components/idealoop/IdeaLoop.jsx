import { useState } from 'react'
import { Zap, Plus, RefreshCw, Sparkles, Radar, Loader2, Check, TrendingUp, BookOpen } from 'lucide-react'
import useStore from '../../store/useStore'
import { generateIdeasFromInsights, generateIdeasFromTrends } from '../../utils/ideaGenerator'
import { PlatformBadge, FormatBadge, PriorityBadge } from '../common/Badge'

const SOURCE_ICONS = { insight: Sparkles, trend: Radar, ai: Zap }
const SOURCE_COLORS = {
  insight: 'bg-purple-100 text-purple-700 border-purple-200',
  trend: 'bg-blue-100 text-blue-700 border-blue-200',
  ai: 'bg-amber-100 text-amber-700 border-amber-200',
}

function GeneratedIdeaCard({ idea, onSave, saved }) {
  const Icon = SOURCE_ICONS[idea.source_type] || Zap

  return (
    <div className={`card-hover p-4 space-y-3 relative transition-all ${saved ? 'opacity-60' : ''}`}>
      {saved && (
        <div className="absolute top-3 right-3 p-1 rounded-full bg-emerald-500 text-white">
          <Check size={11} />
        </div>
      )}

      {/* Source badge */}
      <div className="flex items-center gap-1.5">
        <span className={`chip border text-[10px] ${SOURCE_COLORS[idea.source_type] || SOURCE_COLORS.ai}`}>
          <Icon size={10} />
          {idea.source_type === 'insight' ? 'From Insights' : idea.source_type === 'trend' ? 'From Trends' : 'AI Generated'}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-800 leading-snug">{idea.title}</h3>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{idea.description}</p>

      {/* Meta */}
      <div className="flex flex-wrap gap-1.5">
        <PlatformBadge platform={idea.platform} />
        <FormatBadge format={idea.format} />
        <PriorityBadge priority={idea.priority} />
      </div>

      {/* Hook type */}
      {idea.hook && (
        <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
          <span className="text-orange-500 font-medium">Hook:</span>
          <span className="capitalize">{idea.hook}</span>
        </div>
      )}

      {/* Save button */}
      <div className="pt-1 border-t border-gray-100">
        <button
          onClick={() => onSave(idea)}
          disabled={saved}
          className={saved ? 'flex items-center gap-1.5 text-xs text-emerald-400 font-medium' : 'btn-primary text-xs w-full justify-center py-2'}
        >
          {saved ? <><Check size={12} /> Saved to Ideas Hub</> : <><Plus size={12} /> Save to Ideas Hub</>}
        </button>
      </div>
    </div>
  )
}

export default function IdeaLoop() {
  const insights = useStore((s) => s.insights)
  const trendResults = useStore((s) => s.trendResults)
  const generatedIdeas = useStore((s) => s.generatedIdeas)
  const setGeneratedIdeas = useStore((s) => s.setGeneratedIdeas)
  const saveGeneratedIdea = useStore((s) => s.saveGeneratedIdea)

  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState('all')
  const [savedIds, setSavedIds] = useState(new Set())

  const hasInsights = insights.length > 0
  const hasTrends = !!trendResults

  const handleGenerate = async (src = source) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))

    let ideas = []
    if (src === 'insights' || src === 'all') {
      ideas = [...ideas, ...generateIdeasFromInsights(insights, 6)]
    }
    if ((src === 'trends' || src === 'all') && trendResults) {
      ideas = [...ideas, ...generateIdeasFromTrends(trendResults, 4)]
    }
    if (src === 'ai' || ideas.length === 0) {
      ideas = [...ideas, ...generateIdeasFromInsights([], 6)]
    }

    setGeneratedIdeas(ideas)
    setLoading(false)
    setSavedIds(new Set())
  }

  const handleSave = (idea) => {
    saveGeneratedIdea(idea)
    setSavedIds((s) => new Set([...s, idea.id]))
  }

  const fromInsights = generatedIdeas.filter((i) => i.source_type === 'insight')
  const fromTrends = generatedIdeas.filter((i) => i.source_type === 'trend')
  const fromAI = generatedIdeas.filter((i) => i.source_type === 'ai')

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border border-orange-200 p-6">
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-amber-100">
                <Zap size={16} className="text-amber-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Idea Generation Loop</h2>
            </div>
            <p className="text-sm text-gray-500 max-w-lg">
              Generates new content ideas powered by your performance insights and trend radar results.
              The more data you have, the smarter the suggestions get.
            </p>
          </div>
        </div>
      </div>

      {/* Source selector + generate */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2 font-medium">Generate from:</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'Everything', icon: RefreshCw },
              { id: 'insights', label: `Analytics Insights ${hasInsights ? `(${insights.length})` : '(0)'}`, icon: Sparkles, disabled: !hasInsights },
              { id: 'trends', label: `Trend Radar ${hasTrends ? `(${trendResults?.topic})` : '(none)'}`, icon: Radar, disabled: !hasTrends },
              { id: 'ai', label: 'Pure AI', icon: Zap },
            ].map(({ id, label, icon: Icon, disabled }) => (
              <button
                key={id}
                onClick={() => setSource(id)}
                disabled={disabled}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  source === id
                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : disabled
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => handleGenerate(source)}
          disabled={loading}
          className="btn-primary shrink-0"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Zap size={14} /> Generate Ideas</>}
        </button>
      </div>

      {/* Context cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`card p-4 border ${hasInsights ? 'border-purple-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className={hasInsights ? 'text-purple-500' : 'text-gray-300'} />
            <span className="text-xs font-semibold text-gray-700">Insights Available</span>
          </div>
          {hasInsights ? (
            <div className="space-y-1">
              {insights.slice(0, 3).map((ins) => (
                <p key={ins.id} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5 shrink-0">•</span> {ins.title}
                </p>
              ))}
              {insights.length > 3 && <p className="text-[11px] text-gray-400">+ {insights.length - 3} more</p>}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No insights yet. Generate them in the Insight Engine module.</p>
          )}
        </div>

        <div className={`card p-4 border ${hasTrends ? 'border-blue-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Radar size={14} className={hasTrends ? 'text-blue-500' : 'text-gray-300'} />
            <span className="text-xs font-semibold text-gray-700">Trend Radar Data</span>
          </div>
          {hasTrends ? (
            <div className="space-y-1">
              <p className="text-[11px] text-gray-700 font-medium">Topic: "{trendResults.topic}"</p>
              <p className="text-[11px] text-gray-500">{trendResults.opportunities?.length} opportunities found</p>
              <p className="text-[11px] text-gray-500">{trendResults.creators?.length} creators analyzed</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No trend data yet. Use the Trend Radar to analyze a niche.</p>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
            <Zap size={18} className="absolute inset-0 m-auto text-amber-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Generating ideas...</p>
            <p className="text-xs text-gray-400 mt-1">Combining insights, trends, and AI creativity</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && generatedIdeas.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              {generatedIdeas.length} Ideas Generated
              {savedIds.size > 0 && (
                <span className="ml-2 text-xs text-emerald-600 font-normal">({savedIds.size} saved)</span>
              )}
            </h3>
            <button onClick={() => handleGenerate(source)} className="btn-ghost text-xs">
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>

          {/* From Insights */}
          {fromInsights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-purple-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">From Analytics Insights</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {fromInsights.map((idea) => (
                  <GeneratedIdeaCard key={idea.id} idea={idea} onSave={handleSave} saved={savedIds.has(idea.id)} />
                ))}
              </div>
            </div>
          )}

          {/* From Trends */}
          {fromTrends.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Radar size={13} className="text-blue-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">From Trend Radar</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {fromTrends.map((idea) => (
                  <GeneratedIdeaCard key={idea.id} idea={idea} onSave={handleSave} saved={savedIds.has(idea.id)} />
                ))}
              </div>
            </div>
          )}

          {/* AI only */}
          {fromAI.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} className="text-amber-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Generated</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {fromAI.map((idea) => (
                  <GeneratedIdeaCard key={idea.id} idea={idea} onSave={handleSave} saved={savedIds.has(idea.id)} />
                ))}
              </div>
            </div>
          )}

          {savedIds.size > 0 && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-3">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700">
                <span className="font-semibold">{savedIds.size} {savedIds.size === 1 ? 'idea' : 'ideas'}</span> saved to your Ideas Hub — visible in the Ideas Hub and Content Board.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && generatedIdeas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-4">
            <Zap size={28} className="text-amber-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Ready to generate ideas</h3>
          <p className="text-gray-400 text-sm max-w-sm mb-4">
            Click "Generate Ideas" to create new content ideas powered by your analytics insights and trend radar data.
          </p>
          <button onClick={() => handleGenerate(source)} className="btn-primary">
            <Zap size={14} /> Generate Ideas Now
          </button>
        </div>
      )}
    </div>
  )
}
