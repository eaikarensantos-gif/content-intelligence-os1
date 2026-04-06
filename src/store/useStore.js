import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { enrichMetric, generateInsights } from '../utils/analytics'
import {
  dbLoadAll,
  dbInsertIdea, dbUpdateIdea, dbDeleteIdea,
  dbInsertPost, dbUpdatePost, dbDeletePost,
  dbInsertMetric, dbUpdateMetric, dbDeleteMetric,
} from '../lib/db'

const useStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────
      ideas: [],
      posts: [],
      metrics: [],
      insights: [],
      generatedIdeas: [],
      trendResults: null,
      dbSynced: false,

      // ── Load from Supabase ─────────────────────────────────
      loadFromDB: async () => {
        try {
          const data = await dbLoadAll()
          if (!data) return false
          set({ ideas: data.ideas, posts: data.posts, metrics: data.metrics, dbSynced: true })
          return true
        } catch (err) {
          console.error('[Store] loadFromDB:', err.message)
          return false
        }
      },

      // ── Ideas ──────────────────────────────────────────────
      addIdea: (idea) => {
        const newIdea = {
          id: uuidv4(),
          created_at: new Date().toISOString(),
          tags: [],
          ...idea,
        }
        set((s) => ({ ideas: [newIdea, ...s.ideas] }))
        dbInsertIdea(newIdea)
        return newIdea.id
      },

      updateIdea: (id, updates) => {
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...updates } : i)) }))
        dbUpdateIdea(id, updates)
      },

      deleteIdea: (id) => {
        set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) }))
        dbDeleteIdea(id)
      },

      convertIdeaToPost: (ideaId) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (!idea) return
        const postId = uuidv4()
        const newPost = {
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
        }
        set((s) => ({
          posts: [newPost, ...s.posts],
          ideas: s.ideas.map((i) => i.id === ideaId ? { ...i, post_id: postId, status: 'draft' } : i),
        }))
        dbInsertPost(newPost)
        dbUpdateIdea(ideaId, { post_id: postId, status: 'draft' })
        return postId
      },

      // ── Posts ──────────────────────────────────────────────
      addPost: (post) => {
        const newPost = { id: uuidv4(), created_at: new Date().toISOString(), ...post }
        set((s) => ({ posts: [newPost, ...s.posts] }))
        dbInsertPost(newPost)
      },

      updatePost: (id, updates) => {
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)) }))
        dbUpdatePost(id, updates)
      },

      deletePost: (id) => {
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }))
        dbDeletePost(id)
      },

      // ── Metrics ────────────────────────────────────────────
      addMetric: (metric) => {
        const enriched = enrichMetric(metric)
        const newMetric = { id: uuidv4(), ...enriched }
        set((s) => ({ metrics: [newMetric, ...s.metrics] }))
        dbInsertMetric(newMetric)
      },

      updateMetric: (id, updates) => {
        set((s) => ({
          metrics: s.metrics.map((m) => m.id === id ? enrichMetric({ ...m, ...updates }) : m),
        }))
        dbUpdateMetric(id, updates)
      },

      deleteMetric: (id) => {
        set((s) => ({ metrics: s.metrics.filter((m) => m.id !== id) }))
        dbDeleteMetric(id)
      },

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
        get().addIdea({
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

      // ── Reset ──────────────────────────────────────────────
      reset: () => set({ ideas: [], posts: [], metrics: [], insights: [], generatedIdeas: [], trendResults: null }),
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
