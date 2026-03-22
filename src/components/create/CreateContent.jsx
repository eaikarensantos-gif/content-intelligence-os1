import { useNavigate } from 'react-router-dom'
import { Brain, Sparkles, Wand2, Mic, ArrowRight, Lightbulb, PenTool } from 'lucide-react'
import clsx from 'clsx'

const SECTIONS = [
  {
    label: 'Captura & Estruturação',
    subtitle: 'Transforme ideias brutas em conteúdo estruturado',
    options: [
      {
        id: 'thought',
        to: '/thoughts',
        icon: Brain,
        title: 'Tenho um pensamento',
        description: 'Capture uma ideia, reflexão ou observação antes que ela escape. A IA transforma em conteúdo estruturado.',
        output: '→ Receba: frases virais, roteiros para Reels/Stories/TikTok, carrossel e arco narrativo',
        color: 'from-violet-500 to-purple-600',
        bg: 'bg-violet-50',
        border: 'border-violet-200 hover:border-violet-300',
        iconColor: 'text-violet-600',
        outputColor: 'text-violet-600',
        tag: 'Captura rápida',
      },
      {
        id: 'explore',
        to: '/generate',
        icon: Sparkles,
        title: 'Quero explorar ideias',
        description: 'Explore sinais culturais, tendências e insights do seu nicho. Gere ideias autênticas com estrutura narrativa.',
        output: '→ Receba: ideias com gancho, estrutura narrativa e argumento central',
        color: 'from-orange-500 to-amber-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200 hover:border-orange-300',
        iconColor: 'text-orange-600',
        outputColor: 'text-orange-600',
        tag: 'Exploração criativa',
      },
    ],
  },
  {
    label: 'Produção de Conteúdo',
    subtitle: 'Adapte e transforme conteúdo para publicar',
    options: [
      {
        id: 'write',
        to: '/text',
        icon: Wand2,
        title: 'Quero escrever conteúdo',
        description: 'Adapte qualquer texto para Instagram, LinkedIn, Twitter e mais. A IA ajusta tom, formato e estrutura.',
        output: '→ Receba: texto adaptado para cada plataforma (LinkedIn, Instagram, Reels, Stories, TikTok, YouTube)',
        color: 'from-emerald-500 to-teal-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200 hover:border-emerald-300',
        iconColor: 'text-emerald-600',
        outputColor: 'text-emerald-600',
        tag: 'Produção de texto',
      },
      {
        id: 'presentation',
        to: '/presentation',
        icon: Mic,
        title: 'Quero preparar uma apresentação',
        description: 'Crie talks e apresentações com roteiro em linguagem falada. Abertura, blocos, frases de impacto e fechamento.',
        output: '→ Receba: roteiro completo com abertura, blocos de conteúdo e fechamento',
        color: 'from-rose-500 to-pink-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200 hover:border-rose-300',
        iconColor: 'text-rose-600',
        outputColor: 'text-rose-600',
        tag: 'Modo apresentação',
      },
    ],
  },
]

export default function CreateContent() {
  const navigate = useNavigate()

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-14 max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium mb-5">
          <PenTool size={12} />
          Criar Conteúdo
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Como você quer começar?
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Escolha o ponto de partida que faz mais sentido agora. Você pode navegar entre os modos a qualquer momento.
        </p>
      </div>

      {/* Grouped Option Cards */}
      <div className="w-full max-w-3xl space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gray-200" />
              <div className="text-center shrink-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{section.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{section.subtitle}</p>
              </div>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Cards */}
            <div className="grid gap-4 sm:gap-5">
              {section.options.map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.id}
                    onClick={() => navigate(opt.to)}
                    className={clsx(
                      'group w-full text-left rounded-2xl border p-5 sm:p-6 transition-all duration-200',
                      'hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
                      opt.border,
                      'bg-white'
                    )}
                  >
                    <div className="flex items-start gap-4 sm:gap-5">
                      {/* Icon */}
                      <div className={clsx(
                        'shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center',
                        opt.bg
                      )}>
                        <Icon size={20} className={opt.iconColor} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                            {opt.title}
                          </h3>
                          <span className={clsx(
                            'hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full',
                            opt.bg, opt.iconColor
                          )}>
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {opt.description}
                        </p>
                        <p className={clsx('text-xs font-semibold mt-1.5 leading-relaxed', opt.outputColor)}>
                          {opt.output}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="shrink-0 self-center">
                        <ArrowRight
                          size={18}
                          className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Flow hint */}
      <div className="mt-10 sm:mt-14 flex items-center gap-3 text-xs text-gray-400">
        <Lightbulb size={13} />
        <span>Pensamento → Ideias → Texto → Hub de Ideias</span>
      </div>
    </div>
  )
}
