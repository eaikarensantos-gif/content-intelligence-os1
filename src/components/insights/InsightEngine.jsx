import { useState } from 'react'
import { Sparkles, RefreshCw, TrendingUp, Award, BarChart2, Layers, MessageSquare, Loader2, Zap, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import useStore from '../../store/useStore'
import useAIStore from '../../store/useAIStore'
import { InsightTypeBadge } from '../common/Badge'
import { generateInsights } from '../../utils/analytics'
import { aiGenerateInsights } from '../../lib/aiService'

const ICONS = {
  format: Layers,
  hook: MessageSquare,
  platform: TrendingUp,
  summary: BarChart2,
  topic: Award,
}

const RECS_COLORS = {
  format: 'border-indigo-200 bg-indigo-50',
  hook: 'border-amber-200 bg-amber-50',
  platform: 'border-blue-200 bg-blue-50',
  summary: 'border-orange-200 bg-orange-50',
  topic: 'border-emerald-200 bg-emerald-50',
}

function InsightCard({ insight }) {
  const Icon = ICONS[insight.type] || BarChart2
  const colorClass = RECS_COLORS[insight.type] || RECS_COLORS.summary

  return (
    <div className={`card border ${colorClass} p-5 space-y-3 animate-slide-up`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gray-100 shrink-0 mt-0.5">
          <Icon size={16} className="text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <InsightTypeBadge type={insight.type} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{insight.title}</h3>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed pl-11">{insight.description}</p>

      {insight.recommendation && (
        <div className="ml-11 p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-2">
          <span className="text-orange-500 text-sm mt-0.5 shrink-0">→</span>
          <p className="text-xs text-gray-700 font-medium">{insight.recommendation}</p>
        </div>
      )}
    </div>
  )
}

export default function InsightEngine() {
  const metrics = useStore((s) => s.metrics)
  const posts = useStore((s) => s.posts)
  const insights = useStore((s) => s.insights)
  const setInsights = useStore((s) => s.generateInsights)
  const clearInsights = useStore((s) => s.clearInsights)

  const aiSettings = useAIStore((s) => s.getSettings())
  const isAIConfigured = useAIStore((s) => s.isConfigured())

  const [loading, setLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiPowered, setAiPowered] = useState(false)

  const canGenerate = metrics.length >= 2

  const handleGenerate = async () => {
    setLoading(true)
    setAiError('')

    try {
      if (isAIConfigured) {
        const generated = await aiGenerateInsights(aiSettings, { posts, metrics })
        useStore.setState({ insights: generated })
        setAiPowered(true)
      } else {
        // Rule-based insights calculated from the user's own real data
        setInsights()
        setAiPowered(false)
      }
    } catch (err) {
      setAiError(err.message)
      // IA indisponível — mantém análise baseada nos dados reais do usuário
      setInsights()
      setAiPowered(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-white to-white border border-orange-200 p-6">
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-orange-500" />
              <h2 className="text-base font-bold text-gray-900">
                {isAIConfigured ? 'AI Insight Engine' : 'Insight Engine'}
              </h2>
              {isAIConfigured && (
                <span className="chip bg-violet-100 text-violet-700 border border-violet-200">
                  <Zap size={9} /> AI-powered
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 max-w-lg">
              {isAIConfigured
                ? 'Uses AI to deeply analyze your post performance data — revealing nuanced insights about formats, hooks, and platforms driving your results.'
                : 'Automatically generates insights from your post performance data — revealing which formats, hooks, and platforms are driving your best results.'}
            </p>
            {!canGenerate && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠ You need at least 2 metric entries to generate insights. Add more in Analytics.
              </p>
            )}
            {!isAIConfigured && (
              <NavLink to="/settings" className="inline-flex items-center gap-1.5 mt-2 text-xs text-violet-600 hover:underline">
                <Settings size={11} /> Connect AI for deeper analysis
              </NavLink>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {insights.length > 0 && (
              <button onClick={clearInsights} className="btn-secondary text-xs">
                Clear
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="btn-primary"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
              ) : (
                <><RefreshCw size={14} /> {insights.length > 0 ? 'Regenerate' : 'Generate Insights'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Posts Tracked', value: posts.length },
          { label: 'Metric Snapshots', value: metrics.length },
          { label: 'Insights Generated', value: insights.length },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* AI error */}
      {aiError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          IA indisponível: {aiError} — exibindo análise baseada nos seus dados reais.
        </div>
      )}

      {/* Insights */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Sparkles size={18} className="absolute inset-0 m-auto text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">
              {isAIConfigured ? 'AI is analyzing your data...' : 'Processing your data...'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Analyzing formats, hooks, platforms, and patterns</p>
          </div>
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              {insights.length} Insights Found
              {aiPowered && (
                <span className="chip bg-violet-100 text-violet-700 border border-violet-200 text-[10px]">
                  <Zap size={9} /> AI
                </span>
              )}
            </h3>
            <span className="text-xs text-gray-400">Based on {metrics.length} metric snapshots</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
          </div>
        </div>
      )}

      {!loading && insights.length === 0 && canGenerate && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-4">
            <Sparkles size={28} className="text-orange-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Ready to generate insights</h3>
          <p className="text-gray-400 text-sm max-w-sm mb-4">
            Click "Generate Insights" to analyze your {metrics.length} metric snapshots and discover what's working.
          </p>
          <button onClick={handleGenerate} className="btn-primary">
            <Sparkles size={14} /> Generate Insights
          </button>
        </div>
      )}

      {!loading && !canGenerate && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-4">
            <BarChart2 size={28} className="text-amber-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Not enough data yet</h3>
          <p className="text-gray-400 text-sm max-w-sm">
            Add at least 2 performance snapshots in the Analytics module to enable insight generation.
          </p>
        </div>
      )}
    </div>
  )
}
