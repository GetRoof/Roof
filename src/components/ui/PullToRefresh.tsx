import { useRef, useState, useEffect, ReactNode, RefObject } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import RoofLogo from '../../assets/RoofLogo'

const PULL_THRESHOLD = 64
const MAX_PULL = 100

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  scrollRef?: RefObject<HTMLDivElement>
}

export default function PullToRefresh({ onRefresh, children, className = '', scrollRef: externalScrollRef }: PullToRefreshProps) {
  type Phase = 'idle' | 'pulling' | 'refreshing' | 'completing'
  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const internalScrollRef = useRef<HTMLDivElement>(null)
  const scrollRef = externalScrollRef ?? internalScrollRef
  const startYRef = useRef(0)
  const activeRef = useRef(false)

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const pullY = useMotionValue(0)
  const indicatorHeight = useTransform(pullY, [0, MAX_PULL], [0, 48])
  const logoScale = useTransform(pullY, [0, PULL_THRESHOLD], [0.5, 1])
  const logoRotate = useTransform(pullY, [0, PULL_THRESHOLD], [0, 360])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      startYRef.current = e.touches[0].clientY
      activeRef.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      const p = phaseRef.current
      if (p === 'refreshing' || p === 'completing') return
      if ((el.scrollTop ?? 0) > 2) return

      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) return

      e.preventDefault()
      activeRef.current = true
      pullY.set(Math.min(dy * 0.5, MAX_PULL))
      if (p === 'idle') setPhaseSync('pulling')
    }

    const handleTouchEnd = async () => {
      if (!activeRef.current) return
      activeRef.current = false

      const pull = pullY.get()
      if (pull >= PULL_THRESHOLD) {
        setPhaseSync('refreshing')
        animate(pullY, PULL_THRESHOLD, { duration: 0.15 })
        await onRefresh()
        setPhaseSync('completing')
        animate(pullY, 0, { duration: 0.3, ease: [0.22, 1, 0.36, 1] })
        setTimeout(() => setPhaseSync('idle'), 350)
      } else {
        animate(pullY, 0, { duration: 0.25, ease: [0.22, 1, 0.36, 1] })
        setTimeout(() => setPhaseSync('idle'), 280)
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullY, onRefresh])

  return (
    <div className={`relative flex-1 min-h-0 flex flex-col overflow-hidden ${className}`}>
      {/* Pull indicator — sits above the scroll area, pushes content down */}
      <motion.div
        className="flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ height: indicatorHeight }}
      >
        {phase === 'refreshing' || phase === 'completing' ? (
          <Loader2 size={20} strokeWidth={2} className="text-muted animate-spin" />
        ) : (
          <motion.div style={{ scale: logoScale, rotate: logoRotate }}>
            <RoofLogo color="#a3a3a3" size={24} />
          </motion.div>
        )}
      </motion.div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide h-full">
        {children}
      </div>
    </div>
  )
}
