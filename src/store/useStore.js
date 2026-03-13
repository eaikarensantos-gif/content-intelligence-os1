import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { sampleIdeas, samplePosts, sampleMetrics } from '../data/sampleData'
import { enrichMetric, generateInsights } from '../utils/analytics'

const useStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────
      ideas: sampleIdeas,
      posts: samplePosts,
      metrics: sampleMetrics,
      insights: [],
      generatedIdeas: [],
      trendResults: null,

      // ── Ideas ──────────────────────────────────────────────
      addIdea: (idea) =>
        set((s) => ({
          ideas: [
            ...s.ideas,
            {
              id: uuidv4(),
              created_at: new Date().toISOString(),
              tags: [],
              ...idea,
            },
          ],
        })),

      updateIdea: (id, updates) =>
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      deleteIdea: (id) =>
        set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),

      convertIdeaToPost: (ideaId) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (!idea) return
        const postId = uuidv4()
        set((s) => ({
          posts: [
            ...s.posts,
            {
              id: postId,
              idea_id: ideaId,
              title: idea.title,
              content: idea.description,
              platform: idea.platform,
              format: idea.format,
              hook_type: idea.hook_type,
              status: 'draft',
              published_at: null,
              created_at: new Date().toISOString(),
            },
          ],
          ideas: s.ideas.map((i) =>
            i.id === ideaId ? { ...i, post_id: postId, status: 'draft' } : i
          ),
        }))
        return postId
      },

      // ── Posts ──────────────────────────────────────────────
      addPost: (post) =>
        set((s) => ({
          posts: [...s.posts, { id: uuidv4(), created_at: new Date().toISOString(), ...post }],
        })),

      updatePost: (id, updates) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePost: (id) =>
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

      // ── Metrics ────────────────────────────────────────────
      addMetric: (metric) => {
        const enriched = enrichMetric(metric)
        set((s) => ({
          metrics: [...s.metrics, { id: uuidv4(), ...enriched }],
        }))
      },

      updateMetric: (id, updates) =>
        set((s) => ({
          metrics: s.metrics.map((m) =>
            m.id === id ? enrichMetric({ ...m, ...updates }) : m
          ),
        })),

      deleteMetric: (id) =>
        set((s) => ({ metrics: s.metrics.filter((m) => m.id !== id) })),

      // ── Insights ───────────────────────────────────────────
      generateInsights: () => {
        const { posts, metrics } = get()
        const generated = generateInsights(posts, metrics)
        set({ insights: generated })
        return generated
      },

      clearInsights: () => set({ insights: [] }),

      // ── Generated Ideas ────────────────────────────────────
      setGeneratedIdeas: (ideas) => set({ generatedIdeas: ideas }),

      saveGeneratedIdea: (genIdea) => {
        const { addIdea } = get()
        addIdea({
          title: genIdea.title,
          description: genIdea.description,
          topic: genIdea.topic,
          format: genIdea.format,
          hook_type: genIdea.hook,
          platform: genIdea.platform,
          priority: genIdea.priority || 'medium',
          status: 'idea',
          tags: [genIdea.source_type, genIdea.topic].filter(Boolean),
        })
      },

      // ── Trend Results ──────────────────────────────────────
      setTrendResults: (results) => set({ trendResults: results }),

      // ── Reset (dev helper) ─────────────────────────────────
      reset: () =>
        set({
          ideas: sampleIdeas,
          posts: samplePosts,
          metrics: sampleMetrics,
          insights: [],
          generatedIdeas: [],
          trendResults: null,
        }),
    }),
    {
      name: 'content-intelligence-os-v1',
      partialize: (s) => ({
        ideas: s.ideas,
        posts: s.posts,
        metrics: s.metrics,
        insights: s.insights,
        generatedIdeas: s.generatedIdeas,
        trendResults: s.trendResults,
      }),
    }
  )
)

export default useStore
