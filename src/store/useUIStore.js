import { create } from 'zustand'

// ── UI store: toasts globais + diálogo de confirmação ──────────────────────
// Centraliza o feedback efêmero (sucesso/erro/info) e os diálogos de
// confirmação, substituindo os alert()/confirm() nativos por uma UI
// consistente com o resto do app.

let toastId = 0

const useUIStore = create((set, get) => ({
  toasts: [],
  confirmState: null, // { title, message, confirmLabel, cancelLabel, danger, resolve }

  // ── Toasts ───────────────────────────────────────────────
  addToast: ({ type = 'info', message, duration = 4000 }) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    if (duration > 0) {
      setTimeout(() => get().dismissToast(id), duration)
    }
    return id
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Confirmação ──────────────────────────────────────────
  openConfirm: (opts, resolve) => set({ confirmState: { ...opts, resolve } }),
  resolveConfirm: (result) => {
    const { confirmState } = get()
    if (confirmState?.resolve) confirmState.resolve(result)
    set({ confirmState: null })
  },
}))

export default useUIStore

// ── Helpers de módulo (uso fora de componentes / em handlers) ──────────────
export const toast = {
  success: (message, opts) =>
    useUIStore.getState().addToast({ type: 'success', message, ...opts }),
  error: (message, opts) =>
    useUIStore.getState().addToast({ type: 'error', message, duration: 6000, ...opts }),
  info: (message, opts) =>
    useUIStore.getState().addToast({ type: 'info', message, ...opts }),
}

// Retorna uma Promise<boolean>: resolve(true) ao confirmar, resolve(false) ao cancelar.
export function confirmDialog(opts = {}) {
  return new Promise((resolve) => {
    useUIStore.getState().openConfirm(
      {
        title: opts.title || 'Confirmar',
        message: opts.message || 'Tem certeza?',
        confirmLabel: opts.confirmLabel || 'Confirmar',
        cancelLabel: opts.cancelLabel || 'Cancelar',
        danger: opts.danger ?? false,
      },
      resolve,
    )
  })
}
