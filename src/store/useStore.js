import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { enrichMetric, generateInsights } from '../utils/analytics'

const useStore = create(
  persist(
    (set, get) => ({
      // ── Estado ─────────────────────────────────────────────
      ideas: [],
      posts: [],
      metrics: [],
      insights: [],
      generatedIdeas: [],
      trendResults: null,
      clients: [],
      videoAnalyses: [],
      thoughtCaptures: [],
      tasks: [],
      ads: [],

      // ── Ideias ─────────────────────────────────────────────
      addIdea: (idea) =>
        set((s) => ({
          ideas: [
            ...s.ideas,
            { id: uuidv4(), created_at: new Date().toISOString(), tags: [], ...idea },
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
              client_id: idea.client_id || null,
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
          posts: [...s.posts, { id: uuidv4(), created_at: new Date().toISOString(), client_id: null, ...post }],
        })),

      updatePost: (id, updates) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePost: (id) =>
        set((s) => ({
          posts: s.posts.filter((p) => p.id !== id),
          metrics: s.metrics.filter((m) => m.post_id !== id),
        })),

      // ── Métricas ───────────────────────────────────────────
      addMetric: (metric) => {
        const enriched = enrichMetric(metric)
        set((s) => ({
          metrics: [...s.metrics, { id: uuidv4(), created_at: new Date().toISOString(), ...enriched }],
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

      clearMetrics: () => set({ metrics: [], posts: [], insights: [] }),

      // ── Insights ───────────────────────────────────────────
      generateInsights: () => {
        const { posts, metrics } = get()
        const generated = generateInsights(posts, metrics)
        set({ insights: generated })
        return generated
      },

      clearInsights: () => set({ insights: [] }),

      deleteInsight: (id) =>
        set((s) => ({ insights: s.insights.filter((i) => i.id !== id) })),

      // ── Análises de Vídeo ──────────────────────────────────
      addVideoAnalysis: (analysis) =>
        set((s) => ({
          videoAnalyses: [
            ...s.videoAnalyses,
            { id: uuidv4(), ...analysis },
          ],
        })),

      deleteVideoAnalysis: (id) =>
        set((s) => ({ videoAnalyses: s.videoAnalyses.filter((v) => v.id !== id) })),

      // ── Thought Captures ───────────────────────────────────
      addThoughtCapture: (capture) =>
        set((s) => ({
          thoughtCaptures: [
            { id: uuidv4(), created_at: new Date().toISOString(), ...capture },
            ...s.thoughtCaptures,
          ],
        })),

      deleteThoughtCapture: (id) =>
        set((s) => ({ thoughtCaptures: s.thoughtCaptures.filter((t) => t.id !== id) })),

      // ── Ideias Geradas ─────────────────────────────────────
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

      // ── Tendências ─────────────────────────────────────────
      setTrendResults: (results) => set({ trendResults: results }),

      // ── Clientes ───────────────────────────────────────────
      addClient: (client) =>
        set((s) => ({
          clients: [
            ...s.clients,
            { id: uuidv4(), created_at: new Date().toISOString(), color: '#f97316', ...client },
          ],
        })),

      updateClient: (id, updates) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteClient: (id) =>
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      // ── Tasks ────────────────────────────────────────────────
      addTask: (task) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id: uuidv4(),
              created_at: new Date().toISOString(),
              status: 'todo',
              priority: 'medium',
              tags: [],
              subtasks: [],
              ...task,
            },
          ],
        })),

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      reorderTasks: (tasks) => set({ tasks }),

      // ── Ads (Publicidades) ─────────────────────────────────
      addAd: (ad) =>
        set((s) => ({
          ads: [
            ...s.ads,
            { id: uuidv4(), created_at: new Date().toISOString(), ...ad },
          ],
        })),

      updateAd: (id, updates) =>
        set((s) => ({
          ads: s.ads.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAd: (id) =>
        set((s) => ({ ads: s.ads.filter((a) => a.id !== id) })),

      // ── Archetypes ───────────────────────────────────────────
      archetypes: [],
      hybridArchetypes: [],

      addArchetype: (archetype) =>
        set((s) => ({
          archetypes: [...s.archetypes, { id: uuidv4(), created_at: new Date().toISOString(), ...archetype }],
        })),

      updateArchetype: (id, updates) =>
        set((s) => ({
          archetypes: s.archetypes.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteArchetype: (id) =>
        set((s) => ({ archetypes: s.archetypes.filter((a) => a.id !== id) })),

      addHybridArchetype: (hybrid) =>
        set((s) => ({
          hybridArchetypes: [...s.hybridArchetypes, { id: uuidv4(), created_at: new Date().toISOString(), ...hybrid }],
        })),

      deleteHybridArchetype: (id) =>
        set((s) => ({ hybridArchetypes: s.hybridArchetypes.filter((h) => h.id !== id) })),

      // ── Reset ──────────────────────────────────────────────
      reset: () =>
        set({
          ideas: [],
          posts: [],
          metrics: [],
          insights: [],
          generatedIdeas: [],
          trendResults: null,
          clients: [],
          videoAnalyses: [],
          thoughtCaptures: [],
          tasks: [],
          ads: [],
          archetypes: [],
          hybridArchetypes: [],
        }),
    }),
    {
      name: 'content-intelligence-os-v3',
      partialize: (s) => ({
        ideas: s.ideas,
        posts: s.posts,
        metrics: s.metrics,
        insights: s.insights,
        generatedIdeas: s.generatedIdeas,
        trendResults: s.trendResults,
        clients: s.clients,
        videoAnalyses: s.videoAnalyses,
        thoughtCaptures: s.thoughtCaptures,
        tasks: s.tasks,
        ads: s.ads,
        archetypes: s.archetypes,
        hybridArchetypes: s.hybridArchetypes,
      }),
    }
  )
)

export default useStore
