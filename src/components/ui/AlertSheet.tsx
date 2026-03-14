import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell } from 'lucide-react'
import { Alert } from '../../context/AlertsContext'
import { DEFAULT_FILTERS } from './FiltersSheet'

const NL_CITIES = [
  'Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag', 'Eindhoven',
  'Groningen', 'Leiden', 'Haarlem', 'Delft', 'Maastricht',
  'Tilburg', 'Breda', 'Nijmegen', 'Arnhem', 'Enschede',
]

const HOUSING_TYPES: { value: Alert['housingType']; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'room', label: 'Room' },
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
]

function generateName(cities: string[], type: Alert['housingType']): string {
  const cityPart = cities.length > 0 ? cities.slice(0, 2).join(', ') : 'Netherlands'
  const typePart = type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1)
  return `${cityPart} – ${typePart}`
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Alert, 'id' | 'createdAt'>) => void
  initialCities?: string[]
}

export default function AlertSheet({ open, onClose, onSave, initialCities = [] }: Props) {
  const [cities, setCities] = useState<string[]>(initialCities)
  const [cityInput, setCityInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [housingType, setHousingType] = useState<Alert['housingType']>('all')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCities(initialCities)
      setCityInput('')
      setHousingType('all')
      setBudgetMin('')
      setBudgetMax('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = NL_CITIES.filter(
    (c) => c.toLowerCase().includes(cityInput.toLowerCase()) && !cities.includes(c),
  )

  const addCity = (city: string) => {
    setCities((prev) => [...prev, city])
    setCityInput('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const handleSubmit = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    const data: Omit<Alert, 'id' | 'createdAt'> = {
      name: generateName(cities, housingType),
      cities,
      housingType,
      budgetMin: budgetMin ? parseInt(budgetMin) : 0,
      budgetMax: budgetMax ? parseInt(budgetMax) : 0,
      filters: DEFAULT_FILTERS,
    }

    onSave(data)
    onClose()

    if ('Notification' in window && Notification.permission === 'granted') {
      setTimeout(() => {
        new Notification('🏠 New listing found!', {
          body: `A match for "${data.name}" was just posted.`,
        })
      }, 5000)
    }
  }

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
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-50 max-h-[90%] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-border">
              <div>
                <h2 className="text-[17px] font-bold text-foreground">New Alert</h2>
                <p className="text-xs text-muted mt-0.5">We'll notify you when matches are posted</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center active:opacity-60"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Cities */}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Cities</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {cities.map((city) => (
                    <span
                      key={city}
                      className="flex items-center gap-1 bg-foreground text-white px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      {city}
                      <button
                        onClick={() => setCities((prev) => prev.filter((c) => c !== city))}
                        className="ml-0.5 opacity-70"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Add a city…"
                    value={cityInput}
                    onChange={(e) => { setCityInput(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    className="w-full h-11 px-4 rounded-xl border border-border text-[15px] text-foreground placeholder:text-muted focus:border-foreground transition-colors outline-none"
                  />
                  <AnimatePresence>
                    {showDropdown && cityInput.length > 0 && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-full mt-1 left-0 right-0 bg-white border border-border rounded-2xl shadow-md z-10 overflow-hidden"
                      >
                        {suggestions.slice(0, 5).map((city) => (
                          <button
                            key={city}
                            onMouseDown={() => addCity(city)}
                            className="w-full text-left px-4 py-3 text-[15px] text-foreground hover:bg-secondary transition-colors border-b last:border-0 border-border"
                          >
                            {city}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Housing type */}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Housing type</p>
                <div className="flex flex-wrap gap-2">
                  {HOUSING_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setHousingType(value)}
                      className={`px-4 h-10 rounded-full text-sm font-medium border transition-all active:scale-[0.98] ${
                        housingType === value
                          ? 'bg-foreground text-white border-foreground'
                          : 'bg-white text-foreground border-border'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="px-5 py-5 pb-8">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Monthly budget</p>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">€</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      className="w-full h-12 pl-7 pr-3 rounded-xl border border-border text-[15px] text-foreground focus:border-foreground transition-colors outline-none"
                    />
                  </div>
                  <span className="text-muted text-sm flex-shrink-0">—</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">€</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className="w-full h-12 pl-7 pr-3 rounded-xl border border-border text-[15px] text-foreground focus:border-foreground transition-colors outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pt-3 pb-8 flex-shrink-0 border-t border-border bg-white">
              <button
                onClick={handleSubmit}
                disabled={cities.length === 0}
                className="w-full h-14 bg-foreground text-white rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                <Bell size={16} />
                Create alert
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
