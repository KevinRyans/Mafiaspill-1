import { createContext, ReactNode, useContext, useMemo, useState } from "react"

export type Toast = {
  id: string
  title: string
  body?: string
  tone?: "success" | "warning" | "danger" | "info"
}

type ToastContextValue = {
  toasts: Toast[]
  push: (toast: Omit<Toast, "id">) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function makeId() {
  return Math.random().toString(36).slice(2)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const value = useMemo<ToastContextValue>(() => {
    return {
      toasts,
      push: (toast) => {
        const id = makeId()
        const next = { ...toast, id }
        setToasts((prev) => [next, ...prev].slice(0, 4))
        setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== id))
        }, 4000)
      },
      remove: (id) => setToasts((prev) => prev.filter((item) => item.id !== id))
    }
  }, [toasts])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-72 flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border border-white/10 bg-coal/90 p-3 text-xs text-mist/80 shadow-card ${{
              success: "border-neon/40",
              warning: "border-gold/40",
              danger: "border-ember/40",
              info: "border-signal/40"
            }[toast.tone || "info"]}`}
          >
            <div className="text-sm font-semibold text-white">{toast.title}</div>
            {toast.body ? <div className="mt-1 text-xs text-mist/70">{toast.body}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToasts() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("ToastProvider missing")
  }
  return context
}
