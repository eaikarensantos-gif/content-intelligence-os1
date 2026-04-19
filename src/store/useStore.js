import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { enrichMetric, generateInsights } from '../utils/analytics'
import { dbLoadAll, dbSaveAll } from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'

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
      pricingProducts: [],
      proposals: [],
      favorites: [],
      favoritesOpen: false,
      unseenFavorites: 0,
      hiddenReportTags: [],
      bannedWords: [],

      // ── Perfil do Criador ────────────────────────────────
      creatorProfile: {
        niche: '',
        subNiches: [],
        targetAudience: '',
        tone: '',
        platforms: [],
        description: '',
      },

      setCreatorProfile: (profile) =>
        set((s) => ({ creatorProfile: { ...s.creatorProfile, ...profile } })),

      // ── Brand Voice (Master Prompt) ─────────────────────────
      brandVoice: null,
      setBrandVoice: (voice) => set({ brandVoice: voice }),

      // ── Dislike Feedback (melhoria contínua) ────────────────
      dislikedContent: [],
      addDislike: (item) =>
        set((s) => ({
          dislikedContent: [...s.dislikedContent.slice(-49), {
            id: uuidv4(),
            created_at: new Date().toISOString(),
            ...item,
          }],
        })),

      // ── Favoritos ─────────────────────────────────────────────
      toggleFavorites: () => set((s) => ({
        favoritesOpen: !s.favoritesOpen,
        unseenFavorites: s.favoritesOpen ? s.unseenFavorites : 0, // reset when opening
      })),
      closeFavorites: () => set({ favoritesOpen: false, unseenFavorites: 0 }),

      addFavorite: (fav) =>
        set((s) => ({
          favorites: [...s.favorites, { id: uuidv4(), created_at: new Date().toISOString(), ...fav }],
          unseenFavorites: s.favoritesOpen ? 0 : s.unseenFavorites + 1,
        })),

      removeFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),

      // ── Tags ocultas do ReportBuilder ─────────────────────
      addHiddenReportTag: (tag) =>
        set((s) => ({ hiddenReportTags: s.hiddenReportTags.includes(tag) ? s.hiddenReportTags : [...s.hiddenReportTags, tag] })),

      removeHiddenReportTag: (tag) =>
        set((s) => ({ hiddenReportTags: s.hiddenReportTags.filter((t) => t !== tag) })),

      clearHiddenReportTags: () => set({ hiddenReportTags: [] }),

      // ── Palavras Proibidas ─────────────────────────────────
      addBannedWord: (word) =>
        set((s) => {
          const w = word.trim().toLowerCase()
          return s.bannedWords.includes(w) ? s : { bannedWords: [...s.bannedWords, w] }
        }),

      removeBannedWord: (word) =>
        set((s) => ({ bannedWords: s.bannedWords.filter((w) => w !== word) })),

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

      // ── Pricing / Propostas ─────────────────────────────────
      setPricingProducts: (products) => set({ pricingProducts: products }),
      addProposal: (proposal) =>
        set((s) => ({
          proposals: [...s.proposals, { id: uuidv4(), created_at: new Date().toISOString(), ...proposal }],
        })),
      deleteProposal: (id) =>
        set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) })),

      // ── Leads ────────────────────────────────────────────────
      leads: [],

      addLead: (lead) =>
        set((s) => ({
          leads: [...s.leads, { id: uuidv4(), created_at: new Date().toISOString(), ...lead }],
        })),

      updateLead: (id, updates) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

      deleteLead: (id) =>
        set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

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

      // ── Supabase sync ─────────────────────────────────────
      dbStatus: 'idle', // idle | loading | connected | error
      dbError: '',
      setDbStatus: (status, err = '') => set({ dbStatus: status, dbError: err }),

      loadFromDB: async () => {
        set({ dbStatus: 'loading' })
        try {
          const data = await dbLoadAll()
          if (!data) { set({ dbStatus: 'idle' }); return false }
          set({
            ...(data.ideas?.length        ? { ideas: data.ideas }               : {}),
            ...(data.posts?.length        ? { posts: data.posts }               : {}),
            ...(data.metrics?.length      ? { metrics: data.metrics }           : {}),
            ...(data.clients?.length      ? { clients: data.clients }           : {}),
            ...(data.tasks?.length        ? { tasks: data.tasks }               : {}),
            ...(data.ads?.length          ? { ads: data.ads }                   : {}),
            ...(data.leads?.length        ? { leads: data.leads }               : {}),
            ...(data.favorites?.length    ? { favorites: data.favorites }       : {}),
            ...(data.archetypes?.length   ? { archetypes: data.archetypes }     : {}),
            ...(data.hybridArchetypes?.length ? { hybridArchetypes: data.hybridArchetypes } : {}),
            ...(data.thoughtCaptures?.length  ? { thoughtCaptures: data.thoughtCaptures }   : {}),
            ...(data.videoAnalyses?.length    ? { videoAnalyses: data.videoAnalyses }       : {}),
            ...(data.pricingProducts?.length  ? { pricingProducts: data.pricingProducts }   : {}),
            ...(data.proposals?.length        ? { proposals: data.proposals }               : {}),
            ...(data.bannedWords?.length      ? { bannedWords: data.bannedWords }           : {}),
            ...(data.hiddenReportTags?.length ? { hiddenReportTags: data.hiddenReportTags } : {}),
            ...(data.creatorProfile && Object.keys(data.creatorProfile).length ? { creatorProfile: data.creatorProfile } : {}),
            ...(data.brandVoice ? { brandVoice: data.brandVoice } : {}),
            dbStatus: 'connected',
            dbError: '',
          })
          return true
        } catch (err) {
          set({ dbStatus: 'error', dbError: err.message })
          return false
        }
      },

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
          leads: [],
          archetypes: [],
          hybridArchetypes: [],
          favorites: [],
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
        leads: s.leads,
        archetypes: s.archetypes,
        hybridArchetypes: s.hybridArchetypes,
        favorites: s.favorites,
        pricingProducts: s.pricingProducts,
        proposals: s.proposals,
        hiddenReportTags: s.hiddenReportTags,
        bannedWords: s.bannedWords,
        creatorProfile: s.creatorProfile,
      }),
    }
  )
)

// ─── Auto-sync debounced ao Supabase ─────────────────────────────────────────
let _syncTimer = null
useStore.subscribe((state) => {
  if (!isSupabaseConfigured()) return
  clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => dbSaveAll(state), 2500)
})

export default useStore
