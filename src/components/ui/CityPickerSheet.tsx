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

export default function CityPickerSheet({ open, cities, selectedCities, onChange, onClose }: Props) {
  const [draft, setDraft] = useState<string[]>(selectedCities)

  // Reset draft to committed selection whenever sheet opens
  useEffect(() => {
    if (open) setDraft(selectedCities)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (city: string) => {
    if (draft.includes(city)) {
      setDraft(draft.filter((c) => c !== city))
    } else {
      setDraft([...draft, city])
    }
  }

  const handleApply = () => {
    onChange(draft)
    onClose()
  }

  const isAll = draft.length === 0

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[28px] z-50 flex flex-col"
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
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-border">
              <h2 className="text-[17px] font-bold text-foreground">Select cities</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center active:opacity-60 text-foreground"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Options */}
            <div className="px-5 py-4 flex flex-col gap-2 overflow-y-auto scrollbar-hide max-h-[55vh]">
              {/* All cities */}
              <button
                onClick={() => setDraft([])}
                className={`flex items-center justify-between w-full h-12 px-4 rounded-2xl border transition-all active:scale-[0.99] ${
                  isAll
                    ? 'bg-foreground border-foreground text-background'
                    : 'bg-background border-border text-foreground'
                }`}
              >
                <span className="text-[15px] font-medium">All cities</span>
                {isAll && <Check size={16} strokeWidth={2.5} />}
              </button>

              {/* Individual cities */}
              {cities.map((city) => {
                const selected = draft.includes(city)
                return (
                  <button
                    key={city}
                    onClick={() => toggle(city)}
                    className={`flex items-center justify-between w-full h-12 px-4 rounded-2xl border transition-all active:scale-[0.99] ${
                      selected
                        ? 'bg-foreground border-foreground text-background'
                        : 'bg-background border-border text-foreground'
                    }`}
                  >
                    <span className="text-[15px] font-medium">{city}</span>
                    {selected && <Check size={16} strokeWidth={2.5} />}
                  </button>
                )
              })}
            </div>

            {/* Apply */}
            <div className="px-5 pt-3 pb-8 flex-shrink-0 border-t border-border">
              <button
                onClick={handleApply}
                className="w-full h-14 bg-foreground text-background rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-all"
              >
                {isAll
                  ? 'Show all cities'
                  : `Show ${draft.length} ${draft.length === 1 ? 'city' : 'cities'}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
