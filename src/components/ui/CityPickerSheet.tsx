import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'

interface Props {
  open: boolean
  cities: string[]
  selectedCities: string[]
  onChange: (cities: string[]) => void
  onClose: () => void
}

const CITY_META: Record<string, { emoji: string; tag: string; description: string; tagClass: string }> = {
  Amsterdam: {
    emoji: '🏛️',
    tag: 'Most popular',
    description: 'Canals, culture & thriving expat community',
    tagClass: 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400',
  },
  Rotterdam: {
    emoji: '🌉',
    tag: 'Affordable',
    description: 'Modern skyline, growing international scene',
    tagClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  },
  Utrecht: {
    emoji: '🎓',
    tag: 'Student city',
    description: 'Young, vibrant and perfectly central',
    tagClass: 'text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400',
  },
  'The Hague': {
    emoji: '⚖️',
    tag: 'International',
    description: 'Embassies, beach & international courts',
    tagClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
  },
  'Den Haag': {
    emoji: '⚖️',
    tag: 'International',
    description: 'Embassies, beach & international courts',
    tagClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
  },
  Eindhoven: {
    emoji: '💡',
    tag: 'Tech hub',
    description: 'ASML, Philips and the design district',
    tagClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
  },
  Groningen: {
    emoji: '🌱',
    tag: 'Budget-friendly',
    description: 'University city with low cost of living',
    tagClass: 'text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400',
  },
}

const FEATURED_CITIES = ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague', 'Eindhoven', 'Groningen']

// Normalize city name variants to a canonical form
function normalizeCity(city: string): string {
  if (city === 'Den Haag') return 'The Hague'
  return city
}

export default function CityPickerSheet({ open, cities, selectedCities, onChange, onClose }: Props) {
  // Deduplicate cities after normalization
  const normalizedCities = [...new Set(cities.map(normalizeCity))]
  const [draft, setDraft] = useState<string[]>(selectedCities)

  useEffect(() => {
    if (open) setDraft(selectedCities)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (city: string) => {
    setDraft((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    )
  }

  const handleApply = () => {
    onChange(draft)
    onClose()
  }

  const isAll = draft.length === 0
  const featuredAvailable = FEATURED_CITIES.filter((c) => normalizedCities.includes(c))
  const otherCities = normalizedCities.filter((c) => !FEATURED_CITIES.includes(c))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/50 z-[3000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[28px] z-[3001] flex flex-col max-h-[92%]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-2 pb-3 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Where to?</h2>
                <p className="text-[13px] text-muted mt-0.5">Pick one or more cities to search in</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center active:opacity-60 text-foreground mt-0.5 flex-shrink-0"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Selected pills strip */}
            <AnimatePresence>
              {draft.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <div className="px-5 pb-3 flex flex-wrap gap-2">
                    {draft.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggle(c)}
                        className="flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded-full text-[13px] font-medium"
                      >
                        {c} <X size={12} strokeWidth={2.5} />
                      </button>
                    ))}
                    <button
                      onClick={() => setDraft([])}
                      className="text-[13px] text-muted font-medium px-2 py-1.5 active:opacity-60"
                    >
                      Clear all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">

              {/* All Netherlands */}
              <button
                onClick={() => setDraft([])}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 mb-4 transition-all active:scale-[0.99] ${
                  isAll ? 'border-foreground bg-foreground/5' : 'border-border bg-background'
                }`}
              >
                <span className="text-2xl">🇳🇱</span>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-semibold text-foreground">All of the Netherlands</p>
                  <p className="text-[12px] text-muted mt-0.5">Search across every city at once</p>
                </div>
                {isAll && (
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                    <Check size={13} strokeWidth={2.5} className="text-background" />
                  </div>
                )}
              </button>

              {/* Featured cities — 2-col grid */}
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Popular cities</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {featuredAvailable.map((city) => {
                  const meta = CITY_META[city]
                  const selected = draft.includes(city)
                  return (
                    <button
                      key={city}
                      onClick={() => toggle(city)}
                      className={`relative flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.97] ${
                        selected ? 'border-foreground bg-foreground/5' : 'border-border bg-background'
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                          <Check size={11} strokeWidth={2.5} className="text-background" />
                        </div>
                      )}
                      <span className="text-2xl mb-2">{meta?.emoji ?? '🏙️'}</span>
                      <p className="text-[14px] font-bold text-foreground leading-tight">{city}</p>
                      {meta && (
                        <span className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.tagClass}`}>
                          {meta.tag}
                        </span>
                      )}
                      {meta && (
                        <p className="text-[11px] text-muted mt-1.5 leading-snug">{meta.description}</p>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Other cities */}
              {otherCities.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">More cities</p>
                  <div className="flex flex-wrap gap-2">
                    {otherCities.map((city) => {
                      const selected = draft.includes(city)
                      return (
                        <button
                          key={city}
                          onClick={() => toggle(city)}
                          className={`flex items-center gap-1.5 h-9 px-4 rounded-full border-2 text-[13px] font-medium transition-all active:scale-[0.97] ${
                            selected
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border text-foreground bg-background'
                          }`}
                        >
                          {selected && <Check size={12} strokeWidth={2.5} />}
                          {city}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* CTA */}
            <div className="px-5 pt-3 pb-8 flex-shrink-0 border-t border-border bg-background">
              <button
                onClick={handleApply}
                className="w-full h-14 bg-foreground text-background rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-all"
              >
                {isAll
                  ? 'Search all cities'
                  : draft.length === 1
                  ? `Search in ${draft[0]}`
                  : `Search in ${draft.length} cities`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
