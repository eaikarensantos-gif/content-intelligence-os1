import { useState } from 'react'
import { Search, Radar, Users, TrendingUp, Lightbulb, Plus, ExternalLink, ChevronDown, ChevronUp, Loader2, Zap, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import useStore from '../../store/useStore'
import useAIStore from '../../store/useAIStore'
import { simulateTrendSearch } from '../../utils/trendSimulator'
import { aiTrendSearch } from '../../lib/aiService'
import { PlatformBadge, FormatBadge } from '../common/Badge'

const PLATFORM_ICONS = {
  linkedin: '💼', instagram: '📸', tiktok: '🎵', youtube: '🎬', twitter: '𝕏',
}

const SUGGESTED = ['AI in business', 'creator economy', 'career in tech', 'digital marketing', 'personal branding', 'solopreneur life']

function CreatorCard({ creator }) {
  return (
    <div className="card p-4 flex items-start gap-3 hover:border-orange-300 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
        {creator.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{creator.name}</span>
          <span className="text-base" title={creator.platform}>{PLATFORM_ICONS[creator.platform]}</span>
        </div>
        <p className="text-xs text-gray-400 mb-1">{creator.handle} · {creator.followers} followers</p>
        <p className="text-[11px] text-gray-500 mb-2">{creator.niche}</p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {(creator.recent_topics || []).slice(0, 2).map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>
            ))}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium shrink-0 ml-2">{creator.avg_engagement} eng.</span>
        </div>
      </div>
    </div>
  )
}

function OpportunityCard({ opp, onSave }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card p-4 space-y-3 hover:border-orange-300 transition-all">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 leading-snug flex-1">{opp.title}</h4>
        <span className={`chip border shrink-0 ${opp.potential === 'Very High' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : opp.potential === 'High' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          {opp.potential}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <PlatformBadge platform={opp.platform} />
        <FormatBadge format={opp.format} />
        <span className="chip bg-amber-100 text-amber-700 border border-amber-200">{opp.hook}</span>
      </div>

      {expanded && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-gray-500 leading-relaxed">{opp.description}</p>
          {opp.content_gap && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] text-gray-500 font-medium mb-0.5">Content Gap Identified:</p>
              <p className="text-xs text-gray-600">{opp.content_gap}</p>
            </div>
          )}
          {opp.hook_example && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-[11px] text-orange-600 font-medium mb-0.5">Hook Example:</p>
              <p className="text-xs text-gray-700 italic">"{opp.hook_example}"</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <button onClick={() => setExpanded((x) => !x)} className="btn-ghost text-xs py-1 px-2">
          {expanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> Details</>}
        </button>
        <button onClick={() => onSave(opp)} className="btn-primary text-xs py-1.5 px-3">
          <Plus size={12} /> Save to Ideas
        </button>
      </div>
    </div>
  )
}

export default function TrendRadar() {
  const setTrendResults = useStore((s) => s.setTrendResults)
  const trendResults = useStore((s) => s.trendResults)
  const addIdea = useStore((s) => s.addIdea)

  const aiSettings = useAIStore((s) => s.getSettings())
  const isAIConfigured = useAIStore((s) => s.isConfigured())

  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [aiError, setAiError] = useState('')

  const handleSearch = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setAiError('')

    try {
      let results

      if (isAIConfigured) {
        // Real AI search
        const aiData = await aiTrendSearch(aiSettings, topic.trim())
        // Merge AI opportunities with simulated creators + patterns
        const simulated = simulateTrendSearch(topic.trim())
        results = {
          ...simulated,
          topic: topic.trim(),
          searched_at: new Date().toISOString(),
          opportunities: aiData.opportunities || simulated.opportunities,
          patterns: {
            ...simulated.patterns,
            recurring_hooks: aiData.recurring_hooks?.length
              ? aiData.recurring_hooks.map((h) => ({ ...h, relevance: `Relevant for ${topic}` }))
              : simulated.patterns.recurring_hooks,
            emerging_topics: aiData.emerging_topics?.length
              ? aiData.emerging_topics
              : simulated.patterns.emerging_topics,
          },
          ai_powered: true,
        }
      } else {
        // Simulation fallback
        await new Promise((r) => setTimeout(r, 1800))
        results = simulateTrendSearch(topic.trim())
      }

      setTrendResults(results)
      setSavedIds(new Set())
    } catch (err) {
      setAiError(err.message)
      // Fallback to simulation on error
      const results = simulateTrendSearch(topic.trim())
      setTrendResults(results)
      setSavedIds(new Set())
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOpp = (opp) => {
    addIdea({
      title: opp.title,
      description: opp.description,
      topic: trendResults?.topic || opp.hook,
      format: opp.format,
      hook_type: opp.hook?.toLowerCase().replace(' hook', '') || 'list',
      platform: opp.platform,
      priority: opp.potential === 'Very High' ? 'high' : opp.potential === 'High' ? 'medium' : 'low',
      status: 'idea',
      tags: ['trend', trendResults?.topic].filter(Boolean),
    })
    setSavedIds((s) => new Set([...s, opp.id]))
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Search */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100">
              <Radar size={18} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Discover Trends in Your Niche</h2>
              <p className="text-xs text-gray-400">Enter a topic to find creators, patterns, and content opportunities</p>
            </div>
          </div>

          {/* AI mode indicator */}
          {isAIConfigured ? (
            <span className="chip bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1">
              <Zap size={10} /> AI-powered
            </span>
          ) : (
            <NavLink to="/settings" className="chip bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 hover:bg-amber-200 transition-colors">
              <Settings size={10} /> Connect AI
            </NavLink>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder='e.g. "AI in business", "creator economy", "career in tech"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !topic.trim()}
            className="btn-primary shrink-0 min-w-[120px]"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Search size={14} /> Analyze</>}
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400">Try:</span>
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => setTopic(s)}
              className="text-[11px] px-2 py-1 rounded-md bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-500 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* AI error notice */}
        {aiError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            AI error: {aiError} — showing simulated results.
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Radar size={20} className="absolute inset-0 m-auto text-orange-500 animate-pulse-glow" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800 mb-1">
              {isAIConfigured ? 'AI is analyzing the market...' : 'Scanning the radar...'}
            </p>
            <p className="text-xs text-gray-400">Discovering creators, patterns, and opportunities for "{topic}"</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && trendResults && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary bar */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
            <Radar size={16} className="text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">Results for </span>
              <span className="text-sm font-bold text-orange-600">"{trendResults.topic}"</span>
              {trendResults.ai_powered && (
                <span className="ml-2 chip bg-violet-100 text-violet-700 border border-violet-200">
                  <Zap size={9} /> AI
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
              <span>{trendResults.creators?.length} creators</span>
              <span>{trendResults.opportunities?.length} opportunities</span>
            </div>
          </div>

          {/* Section 1: Creators */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Relevant Creators</h3>
              <span className="text-[11px] text-gray-400 ml-1">across platforms</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trendResults.creators?.map((c) => <CreatorCard key={c.id} creator={c} />)}
            </div>
          </div>

          {/* Section 2: Patterns */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900">Content Patterns</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Recurring Hooks</h4>
                <div className="space-y-2">
                  {trendResults.patterns?.recurring_hooks?.map((h, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800">{h.hook}</span>
                        <span className="text-[10px] text-orange-600 font-bold">{h.frequency}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 italic">{h.example}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Dominant Formats</h4>
                <div className="space-y-3">
                  {trendResults.patterns?.dominant_formats?.map((pf, i) => (
                    <div key={i}>
                      <PlatformBadge platform={pf.platform} />
                      <div className="mt-1.5 space-y-1">
                        {pf.formats?.map((f, j) => (
                          <div key={j} className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-600">{f.format}</span>
                            <div className="flex items-center gap-2">
                              <span className={f.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}>{f.trend}</span>
                              <span className="text-gray-400">{f.dominance}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Emerging Topics</h4>
                <div className="flex flex-wrap gap-1.5">
                  {trendResults.patterns?.emerging_topics?.map((t, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-gray-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Opportunities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={15} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Content Opportunities</h3>
              <span className="text-[11px] text-gray-400 ml-1">— save ideas directly to your Hub</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {trendResults.opportunities?.map((opp) => (
                <div key={opp.id} className="relative">
                  {savedIds.has(opp.id) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-600/90 rounded-xl backdrop-blur-sm">
                      <span className="text-white font-semibold text-sm">✓ Saved to Ideas Hub</span>
                    </div>
                  )}
                  <OpportunityCard opp={opp} onSave={handleSaveOpp} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !trendResults && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-4">
            <Radar size={28} className="text-orange-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Enter a topic to start</h3>
          <p className="text-gray-400 text-sm max-w-sm mb-4">
            {isAIConfigured
              ? 'AI-powered analysis will discover real opportunities, patterns and trends in your niche.'
              : 'The Trend Radar will discover creators, content patterns, and opportunities tailored to your niche.'}
          </p>
          {!isAIConfigured && (
            <NavLink to="/settings" className="btn-secondary text-xs">
              <Settings size={12} /> Connect AI for real results
            </NavLink>
          )}
        </div>
      )}
    </div>
  )
}
