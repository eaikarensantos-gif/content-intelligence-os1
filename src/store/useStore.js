import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { enrichMetric, generateInsights } from '../utils/analytics'
import { dbLoadAll, dbSaveAll } from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'

/**
 * v1: bannedWords + bannedPhrases (duas listas soltas) viram uma só,
 * posicionamento.lista_negra. Exportada separada do persist() pra dar pra
 * testar sem precisar simular localStorage — a garantia que importa aqui é
 * "nenhum dado existente foi perdido".
 */
export function migratePosicionamento(persistedState) {
  const s = persistedState || {}
  if (!s.posicionamento) {
    const bw = Array.isArray(s.bannedWords) ? s.bannedWords : []
    const bp = Array.isArray(s.bannedPhrases) ? s.bannedPhrases : []
    const lista_negra = [...bw, ...bp].reduce((acc, w) => {
      if (w && !acc.some((x) => x.toLowerCase() === w.toLowerCase())) acc.push(w)
      return acc
    }, [])
    s.posicionamento = {
      ancora: '',
      publicos: [],
      concorrencia_espaco_vago: '',
      ativos: [],
      pilares: [],
      lista_negra,
      teste_coerencia: '',
      trade_off: '',
      diretriz_marca: s.brandVoice?.prompt ? s.brandVoice.prompt.slice(0, 400) : '',
    }
  }
  delete s.bannedWords
  delete s.bannedPhrases
  return s
}

/**
 * loadFromDB() só deve substituir o posicionamento/brandVoice local por uma
 * cópia do Supabase se essa cópia tiver conteúdo de verdade — um objeto
 * vazio/default ainda é "truthy" em JS, então sem essa checagem uma linha
 * vazia ou desatualizada no Supabase apaga silenciosamente o que acabou de
 * ser preenchido localmente (ex.: o auto-save de 2.5s ainda não rodou e a
 * página recarrega antes disso).
 */
function hasPositioningContent(p) {
  if (!p) return false
  return Boolean(
    p.diretriz_marca?.trim() || p.ancora?.trim() || p.concorrencia_espaco_vago?.trim() ||
    p.teste_coerencia?.trim() || p.trade_off?.trim() ||
    p.publicos?.length || p.ativos?.length || p.pilares?.length || p.lista_negra?.length
  )
}

function hasBrandVoiceContent(b) {
  return Boolean(b?.prompt?.trim() || (b?.calibration && Object.keys(b.calibration).length))
}

/**
 * Mesma lógica de hasPositioningContent, mas para listas (ideas, posts, etc):
 * merge por id em vez de substituir a lista inteira. Um card criado no Hub
 * ainda não sincronizado (auto-save debounced em 2.5s) some se um
 * loadFromDB() rodar antes disso e apagar o item local só porque ele não
 * está na cópia do Supabase.
 */
export function mergeById(dbList, localList) {
  if (!dbList?.length) return localList
  const dbIds = new Set(dbList.map((item) => item.id))
  const localOnly = (localList || []).filter((item) => !dbIds.has(item.id))
  return [...dbList, ...localOnly]
}

const useStore = create(
  persist(
    (set, get) => ({
      // ── Estado ─────────────────────────────────────────────
      clips: [],
      ideas: [],
      posts: [],
      metrics: [],
      insights: [],
      generatedIdeas: [],
      trendResults: null,
      clients: [],
      videoAnalyses: [],
      thoughtCaptures: [],
      commentContexts: [],
      tasks: [],
      ads: [],
      pricingProducts: [],
      proposals: [],
      favorites: [],
      favoritesOpen: false,
      unseenFavorites: 0,
      hiddenReportTags: [],
      theme: 'light',
      desafioHistory: [],
      brainItems: [],
      pinnedPages: [],

      togglePinnedPage: (path) =>
        set((s) => ({
          pinnedPages: s.pinnedPages.includes(path)
            ? s.pinnedPages.filter((p) => p !== path)
            : [...s.pinnedPages, path],
        })),

      // ── Perfil do Criador ────────────────────────────────
      creatorProfile: {
        niche: '',
        subNiches: [],
        targetAudience: '',
        tone: '',
        platforms: [],
        description: '',
      },

      setTheme: (t) => set({ theme: t }),

      setCreatorProfile: (profile) =>
        set((s) => ({ creatorProfile: { ...s.creatorProfile, ...profile } })),

      // ── Desafio de Formato (sorteador) ───────────────────────────────────
      addDesafio: (desafio) =>
        set((s) => ({ desafioHistory: [...s.desafioHistory, desafio] })),

      clearDesafioHistory: () => set({ desafioHistory: [] }),

      // ── Content Brain ────────────────────────────────────────────────────
      addBrainItem: (item) =>
        set((s) => ({
          brainItems: [...s.brainItems, {
            id: uuidv4(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'inbox',
            impact: 3,
            effort: 3,
            notes: '',
            ...item,
          }],
        })),

      updateBrainItem: (id, updates) =>
        set((s) => ({
          brainItems: s.brainItems.map((b) =>
            b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
          ),
        })),

      deleteBrainItem: (id) =>
        set((s) => ({ brainItems: s.brainItems.filter((b) => b.id !== id) })),

      // ── Brand Voice (Master Prompt) ─────────────────────────
      brandVoice: null,
      setBrandVoice: (voice) => set({ brandVoice: voice }),

      // ── Posicionamento (Direcional) ──────────────────────────
      // Fonte única da identidade de marca: âncora, públicos, pilares, ativos,
      // lista negra (unifica as antigas bannedWords + bannedPhrases) e o teste
      // de coerência. Editável em /posicionamento; lido por toda geração de IA
      // via buildVoiceContext().
      posicionamento: {
        ancora: '',
        publicos: [],
        concorrencia_espaco_vago: '',
        ativos: [],
        pilares: [],
        lista_negra: [],
        teste_coerencia: '',
        trade_off: '',
        diretriz_marca: '',
      },

      setPosicionamento: (updates) =>
        set((s) => ({ posicionamento: { ...s.posicionamento, ...updates } })),

      addPublico: (publico) =>
        set((s) => ({
          posicionamento: {
            ...s.posicionamento,
            publicos: [...s.posicionamento.publicos, { id: uuidv4(), nome: '', papel: 'nucleo', descricao: '', ...publico }],
          },
        })),
      updatePublico: (id, updates) =>
        set((s) => ({
          posicionamento: {
            ...s.posicionamento,
            publicos: s.posicionamento.publicos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          },
        })),
      removePublico: (id) =>
        set((s) => ({
          posicionamento: { ...s.posicionamento, publicos: s.posicionamento.publicos.filter((p) => p.id !== id) },
        })),

      addAtivo: (ativo) =>
        set((s) => ({
          posicionamento: {
            ...s.posicionamento,
            ativos: [...s.posicionamento.ativos, { id: uuidv4(), rotulo: '', prova: '', ...ativo }],
          },
        })),
      updateAtivo: (id, updates) =>
        set((s) => ({
          posicionamento: {
            ...s.posicionamento,
            ativos: s.posicionamento.ativos.map((a) => (a.id === id ? { ...a, ...updates } : a)),
          },
        })),
      removeAtivo: (id) =>
        set((s) => ({
          posicionamento: { ...s.posicionamento, ativos: s.posicionamento.ativos.filter((a) => a.id !== id) },
        })),

      addPilar: (pilar) =>
        set((s) => ({
          posicionamento: {
            ...s.posicionamento,
            pilares: [...s.posicionamento.pilares, {
              id: uuidv4(), nome: '', objetivo: '', formato_preferido: '', gancho_tipico: '', exemplo: '', ...pilar,
            }],
          },
        })),
      updatePilar: (id, updates) =>
        set((s) => ({
          posicionamento: {
            ...s.posicionamento,
            pilares: s.posicionamento.pilares.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          },
        })),
      removePilar: (id) =>
        set((s) => ({
          posicionamento: { ...s.posicionamento, pilares: s.posicionamento.pilares.filter((p) => p.id !== id) },
        })),

      // Lista negra — cresce pelo botão "Banir" em qualquer aba do Studio de
      // Criação e pela caixa de Frases Banidas do widget flutuante. Dedupe é
      // case-insensitive (evita "Em resumo" e "em resumo" como itens distintos),
      // mas guarda a grafia original pra exibição.
      addListaNegra: (phrase) =>
        set((s) => {
          const p = (phrase || '').trim()
          if (!p) return s
          const exists = s.posicionamento.lista_negra.some((w) => w.toLowerCase() === p.toLowerCase())
          if (exists) return s
          return { posicionamento: { ...s.posicionamento, lista_negra: [...s.posicionamento.lista_negra, p] } }
        }),
      removeListaNegra: (phrase) =>
        set((s) => ({
          posicionamento: { ...s.posicionamento, lista_negra: s.posicionamento.lista_negra.filter((w) => w !== phrase) },
        })),

      // Aliases legados — bannedWords/bannedPhrases eram duas listas separadas
      // antes da unificação em posicionamento.lista_negra. Os nomes continuam
      // pra não obrigar troca em cada tela que já chama essas ações.
      addBannedWord: (word) => get().addListaNegra(word),
      removeBannedWord: (word) => get().removeListaNegra(word),
      addBannedPhrase: (phrase) => get().addListaNegra(phrase),
      removeBannedPhrase: (phrase) => get().removeListaNegra(phrase),

      // ── Dislike Feedback (melhoria contínua) ────────────────
      dislikedContent: [],
      addDislike: (item) =>
        set((s) => ({
          dislikedContent: [...s.dislikedContent.slice(-49), {
            id: uuidv4(),
            created_at: new Date().toISOString(),
            title: item.title || '',
            hook: item.hook || '',
            reason: item.reason || '',
            patterns: item.patterns || [],
          }],
        })),

      // ── Favoritos ─────────────────────────────────────────────
      toggleFavorites: () => set((s) => ({
        favoritesOpen: !s.favoritesOpen,
        unseenFavorites: s.favoritesOpen ? s.unseenFavorites : 0,
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

      // ── Web Clips (Segundo Cérebro) ────────────────────────
      addClip: (clip) =>
        set((s) => {
          if (clip.id && s.clips.some((c) => c.id === clip.id)) return s
          return {
            clips: [
              {
                id: uuidv4(),
                savedAt: new Date().toISOString(),
                status: 'inbox',
                summary: '',
                tags: [],
                notes: '',
                ...clip,
              },
              ...s.clips,
            ],
          }
        }),

      updateClip: (id, updates) =>
        set((s) => ({
          clips: s.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteClip: (id) =>
        set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),

      // ── Ideias ─────────────────────────────────────────────
      addIdea: (idea) =>
        set((s) => ({
          ideas: [
            ...s.ideas,
            { id: uuidv4(), created_at: new Date().toISOString(), tags: [], ...idea },
          ],
        })),

      importIdeas: (newIdeas) =>
        set((s) => ({
          ideas: [
            ...s.ideas,
            ...newIdeas.map((idea) => ({
              id: uuidv4(),
              created_at: new Date().toISOString(),
              tags: [],
              ...idea,
            })),
          ],
        })),

      updateIdea: (id, updates) => {
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...updates } : i)) }))
      },

      deleteIdea: (id) => {
        set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) }))
      },

      deleteIdeasByStatus: (status) =>
        set((s) => ({ ideas: s.ideas.filter((i) => i.status !== status) })),

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

      updatePost: (id, updates) => {
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)) }))
      },

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

      updateMetric: (id, updates) => {
        set((s) => ({
          metrics: s.metrics.map((m) => m.id === id ? enrichMetric({ ...m, ...updates }) : m),
        }))
      },

      deleteMetric: (id) => {
        set((s) => ({ metrics: s.metrics.filter((m) => m.id !== id) }))
      },

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

      // ── Contextos de Comentários (Analisador de Comentários) ────
      addCommentContext: (ctx) =>
        set((s) => ({
          commentContexts: [
            { id: uuidv4(), created_at: new Date().toISOString(), ...ctx },
            ...s.commentContexts,
          ],
        })),

      deleteCommentContext: (id) =>
        set((s) => ({ commentContexts: s.commentContexts.filter((c) => c.id !== id) })),

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

      // ── Referências Virais (Vídeos Virais) ────────────────
      viralReferences: [],

      addViralReference: (ref) =>
        set((s) => ({
          viralReferences: [
            { id: uuidv4(), created_at: new Date().toISOString(), ...ref },
            ...s.viralReferences,
          ],
        })),

      removeViralReference: (id) =>
        set((s) => ({ viralReferences: s.viralReferences.filter((v) => v.id !== id) })),

      // ── Supabase sync ─────────────────────────────────────
      dbStatus: 'idle',
      dbError: '',
      setDbStatus: (status, err = '') => set({ dbStatus: status, dbError: err }),

      loadFromDB: async () => {
        set({ dbStatus: 'loading' })
        try {
          const data = await dbLoadAll()
          if (!data) { set({ dbStatus: 'idle' }); return false }
          const local = get()
          set({
            ideas:             mergeById(data.ideas, local.ideas),
            posts:             mergeById(data.posts, local.posts),
            metrics:           mergeById(data.metrics, local.metrics),
            clients:           mergeById(data.clients, local.clients),
            tasks:             mergeById(data.tasks, local.tasks),
            ads:               mergeById(data.ads, local.ads),
            leads:             mergeById(data.leads, local.leads),
            favorites:         mergeById(data.favorites, local.favorites),
            archetypes:        mergeById(data.archetypes, local.archetypes),
            hybridArchetypes:  mergeById(data.hybridArchetypes, local.hybridArchetypes),
            viralReferences:   mergeById(data.viralReferences, local.viralReferences),
            thoughtCaptures:   mergeById(data.thoughtCaptures, local.thoughtCaptures),
            commentContexts:   mergeById(data.commentContexts, local.commentContexts),
            videoAnalyses:     mergeById(data.videoAnalyses, local.videoAnalyses),
            proposals:         mergeById(data.proposals, local.proposals),
            pricingProducts:   mergeById(data.pricingProducts, local.pricingProducts),
            ...(hasPositioningContent(data.posicionamento) ? { posicionamento: data.posicionamento } : {}),
            ...(data.hiddenReportTags?.length ? { hiddenReportTags: data.hiddenReportTags } : {}),
            ...(data.creatorProfile && Object.keys(data.creatorProfile).length ? { creatorProfile: data.creatorProfile } : {}),
            ...(hasBrandVoiceContent(data.brandVoice) ? { brandVoice: data.brandVoice } : {}),
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
          commentContexts: [],
          tasks: [],
          ads: [],
          leads: [],
          archetypes: [],
          hybridArchetypes: [],
          favorites: [],
          viralReferences: [],
        }),
    }),
    {
      name: 'content-intelligence-os-v3',
      version: 1,
      migrate: migratePosicionamento,
      storage: {
        getItem: (name) => {
          try {
            const val = localStorage.getItem(name)
            return val ? JSON.parse(val) : null
          } catch {
            localStorage.removeItem(name)
            return null
          }
        },
        setItem: (name, value) => {
          try { localStorage.setItem(name, JSON.stringify(value)) } catch { /* quota exceeded — ignore */ }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (s) => ({
        clips: s.clips,
        ideas: s.ideas,
        posts: s.posts,
        metrics: s.metrics,
        insights: s.insights,
        generatedIdeas: s.generatedIdeas,
        trendResults: s.trendResults,
        clients: s.clients,
        videoAnalyses: s.videoAnalyses,
        thoughtCaptures: s.thoughtCaptures,
        commentContexts: s.commentContexts,
        tasks: s.tasks,
        ads: s.ads,
        leads: s.leads,
        archetypes: s.archetypes,
        hybridArchetypes: s.hybridArchetypes,
        favorites: s.favorites,
        viralReferences: s.viralReferences,
        pricingProducts: s.pricingProducts,
        proposals: s.proposals,
        hiddenReportTags: s.hiddenReportTags,
        posicionamento: s.posicionamento,
        theme: s.theme,
        creatorProfile: s.creatorProfile,
        desafioHistory: s.desafioHistory,
        brainItems: s.brainItems,
        pinnedPages: s.pinnedPages,
        audienceProfiles: s.audienceProfiles,
        audienceWeights: s.audienceWeights,
        audienceCuts: s.audienceCuts,
        // brandVoice ficava de fora do partialize — sem Supabase configurado,
        // o questionário de voz da marca se perdia a cada reload. Corrigido aqui.
        brandVoice: s.brandVoice,
      }),
    }
  )
)

// ─── Auto-sync debounced ao Supabase ─────────────────────────────────────────
// Se a aba fechar/recarregar dentro da janela de debounce, a edição nunca
// chega no Supabase — e o próximo loadFromDB() carrega a cópia antiga.
// flushSync() força o save pendente assim que a aba fica oculta, então a
// perda só acontece se o navegador matar o processo antes do fetch sair.
let _syncTimer = null
const flushSync = () => {
  if (!_syncTimer) return
  clearTimeout(_syncTimer)
  _syncTimer = null
  dbSaveAll(useStore.getState())
}
useStore.subscribe((state) => {
  if (!isSupabaseConfigured()) return
  clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => { _syncTimer = null; dbSaveAll(state) }, 2500)
})
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSync()
  })
  window.addEventListener('pagehide', flushSync)
}

export default useStore
