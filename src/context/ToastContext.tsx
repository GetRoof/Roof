import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface Toast {
  id: number
  message: string
  icon?: string
}

interface ToastContextType {
  toast: (message: string, icon?: string) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

let nextId = 0

function ToastOverlay({ toasts }: { toasts: Toast[] }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const ref = useRef(false)

  useEffect(() => {
    if (ref.current) return
    ref.current = true
    // Wait for phone-shell to mount
    const el = document.getElementById('phone-shell')
    if (el) setTarget(el)
    else {
      const observer = new MutationObserver(() => {
        const found = document.getElementById('phone-shell')
        if (found) { setTarget(found); observer.disconnect() }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      return () => observer.disconnect()
    }
  }, [])

  if (!target) return null

  return createPortal(
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-full shadow-lg shadow-black/20 flex items-center gap-2 whitespace-nowrap"
          >
            {t.icon && <span className="text-base">{t.icon}</span>}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    target,
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, icon?: string) => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, icon }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2_500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <ToastOverlay toasts={toasts} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
