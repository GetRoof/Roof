import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown } from 'lucide-react'
import { Listing } from '../../data/listings'

export interface ActiveFilters {
  priceMin: string
  priceMax: string
  sizeMin: string
  sizeMax: string
  rooms: number[]
  neighborhoods: string[]
  furnished: 'all' | 'furnished' | 'unfurnished' | 'upholstered'
}

export const DEFAULT_FILTERS: ActiveFilters = {
  priceMin: '',
  priceMax: '',
  sizeMin: '',
  sizeMax: '',
  rooms: [],
  neighborhoods: [],
  furnished: 'all',
}

export function countActiveFilters(f: ActiveFilters): number {
  let n = 0
  if (f.priceMin || f.priceMax) n++
  if (f.sizeMin || f.sizeMax) n++
  if (f.rooms.length > 0) n++
  if (f.neighborhoods.length > 0) n++
  if (f.furnished !== 'all') n++
  return n
}

// ─── Curated neighbourhoods grouped by city (expat-friendly with emoji vibes) ─
const CURATED_NEIGHBORHOODS: Record<string, { name: string; emoji: string }[]> = {
  Amsterdam: [
    { name: 'Centrum', emoji: '🏙️' },
    { name: 'De Pijp', emoji: '🌺' },
    { name: 'Jordaan', emoji: '🏡' },
    { name: 'Oud-West', emoji: '🌿' },
    { name: 'Oud-Zuid', emoji: '💎' },
    { name: 'Oost', emoji: '🌳' },
    { name: 'Noord', emoji: '🎨' },
    { name: 'West', emoji: '🚲' },
    { name: 'Nieuw-West', emoji: '🌍' },
    { name: 'Zuidas', emoji: '🏢' },
    { name: 'Westerpark', emoji: '🌻' },
    { name: 'IJburg', emoji: '🌊' },
    { name: 'Watergraafsmeer', emoji: '🌲' },
    { name: 'Indische Buurt', emoji: '🕌' },
    { name: 'Bos en Lommer', emoji: '🍃' },
  ],
  Rotterdam: [
    { name: 'Centrum', emoji: '🏙️' },
    { name: 'Kralingen', emoji: '🌊' },
    { name: 'Hillegersberg', emoji: '🌲' },
    { name: 'Delfshaven', emoji: '⚓' },
    { name: 'Noord', emoji: '🌿' },
    { name: 'Feijenoord', emoji: '⚽' },
    { name: 'Overschie', emoji: '🏘️' },
    { name: 'Prins Alexander', emoji: '🌳' },
    { name: 'Charlois', emoji: '🌍' },
  ],
  Utrecht: [
    { name: 'Binnenstad', emoji: '🏛️' },
    { name: 'Oost', emoji: '🌿' },
    { name: 'West', emoji: '🚲' },
    { name: 'Noord', emoji: '🌱' },
    { name: 'Zuid', emoji: '🌳' },
    { name: 'Zuilen', emoji: '🏘️' },
    { name: 'Leidsche Rijn', emoji: '🏡' },
    { name: 'Overvecht', emoji: '🌍' },
  ],
  'The Hague': [
    { name: 'Centrum', emoji: '🏙️' },
    { name: 'Scheveningen', emoji: '🏖️' },
    { name: 'Statenkwartier', emoji: '💎' },
    { name: 'Escamp', emoji: '🌿' },
    { name: 'Haagse Hout', emoji: '🌲' },
    { name: 'Segbroek', emoji: '🌺' },
    { name: 'Loosduinen', emoji: '🌾' },
  ],
  Eindhoven: [
    { name: 'Centrum', emoji: '🏙️' },
    { name: 'Strijp', emoji: '🎨' },
    { name: 'Stratum', emoji: '🌿' },
    { name: 'Woensel-Noord', emoji: '🌱' },
    { name: 'Woensel-Zuid', emoji: '🏘️' },
    { name: 'Gestel', emoji: '🌳' },
  ],
  Groningen: [
    { name: 'Binnenstad', emoji: '🏛️' },
    { name: 'Oosterpoort', emoji: '🎓' },
    { name: 'Korrewegwijk', emoji: '🌿' },
    { name: 'Paddepoel', emoji: '🌱' },
    { name: 'De Wijert', emoji: '🌲' },
    { name: 'Corpus den Hoorn', emoji: '🏘️' },
  ],
}

const FURNISHED_OPTIONS: { value: ActiveFilters['furnished']; label: string; desc: string }[] = [
  { value: 'all',          label: 'Any',          desc: 'Show all options'    },
  { value: 'furnished',    label: 'Furnished',    desc: 'Furniture included'  },
  { value: 'unfurnished',  label: 'Unfurnished',  desc: 'Bring your own'      },
  { value: 'upholstered',  label: 'Upholstered',  desc: 'Shell + basic items' },
]

const PRICE_PRESETS = [
  { label: 'Under €700',     min: '',    max: '700'  },
  { label: '€700 – €1,200',  min: '700', max: '1200' },
  { label: '€1,200 – €1,800',min: '1200',max: '1800' },
  { label: '€1,800 – €2,500',min: '1800',max: '2500' },
  { label: '€2,500+',        min: '2500',max: ''     },
]

const SIZE_PRESETS = [
  { label: 'Studio',   sublabel: '< 20 m²',    min: '',   max: '20'  },
  { label: 'Cozy',     sublabel: '20 – 40 m²', min: '20', max: '40'  },
  { label: 'Standard', sublabel: '40 – 60 m²', min: '40', max: '60'  },
  { label: 'Spacious', sublabel: '60 – 80 m²', min: '60', max: '80'  },
  { label: 'Large',    sublabel: '80 m²+',      min: '80', max: ''    },
]

// ─── Range preset selector ─────────────────────────────────────────────────────
function RangeSection({
  title, subtitle, presets, currentMin, currentMax,
  onSelect, inputPrefix, inputSuffix,
}: {
  title: string
  subtitle: string
  presets: { label: string; sublabel?: string; min: string; max: string }[]
  currentMin: string; currentMax: string
  onSelect: (min: string, max: string) => void
  inputPrefix?: string
  inputSuffix?: string
}) {
  const [showCustom, setShowCustom] = useState(false)
  const activePreset = presets.find((p) => p.min === currentMin && p.max === currentMax)
  const hasCustom = !activePreset && (currentMin || currentMax)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[15px] font-bold text-foreground">{title}</p>
        <p className="text-[12px] text-muted">{subtitle}</p>
      </div>

      {/* Preset chips — wrap layout */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* "Any" chip */}
        <button
          onClick={() => { onSelect('', ''); setShowCustom(false) }}
          className={`h-10 px-4 rounded-full border-2 text-[13px] font-semibold transition-all active:scale-[0.97] ${
            !currentMin && !currentMax
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-foreground border-border'
          }`}
        >
          Any
        </button>

        {presets.map((p) => {
          const active = p.min === currentMin && p.max === currentMax
          return (
            <button
              key={p.label}
              onClick={() => { onSelect(p.min, p.max); setShowCustom(false) }}
              className={`h-10 px-4 rounded-full border-2 text-[13px] font-semibold transition-all active:scale-[0.97] ${
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-foreground border-border'
              }`}
            >
              {p.label}
            </button>
          )
        })}

        {/* Custom toggle */}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={`h-10 px-4 rounded-full border-2 text-[13px] font-semibold flex items-center gap-1 transition-all active:scale-[0.97] ${
            hasCustom
              ? 'bg-foreground text-background border-foreground'
              : showCustom
              ? 'bg-secondary border-border text-foreground'
              : 'bg-background text-foreground border-border'
          }`}
        >
          {hasCustom
            ? currentMin && currentMax
              ? `${inputPrefix ?? ''}${currentMin} – ${currentMax}${inputSuffix ?? ''}`
              : currentMin
              ? `${inputPrefix ?? ''}${currentMin}+`
              : `Up to ${currentMax}${inputSuffix ?? ''}`
            : 'Custom'}
          <ChevronDown
            size={13}
            strokeWidth={2.5}
            className={`transition-transform ${showCustom ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Custom inputs */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {(() => {
              const minNum = currentMin ? Number(currentMin) : null
              const maxNum = currentMax ? Number(currentMax) : null
              const invalid = minNum !== null && maxNum !== null && minNum > maxNum
              return (
                <>
                  <div className="flex gap-3 pt-1 pb-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Min</label>
                      <div className="relative">
                        {inputPrefix && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{inputPrefix}</span>
                        )}
                        <input
                          type="number"
                          placeholder="0"
                          value={currentMin}
                          onChange={(e) => onSelect(e.target.value, currentMax)}
                          className={`w-full h-12 rounded-xl border-2 text-foreground text-[15px] bg-background transition-colors ${invalid ? 'border-red-400' : 'border-border focus:border-foreground'} ${inputPrefix ? 'pl-7 pr-3' : inputSuffix ? 'pl-3 pr-10' : 'px-3'}`}
                        />
                        {inputSuffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{inputSuffix}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end pb-3 text-muted text-lg">—</div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Max</label>
                      <div className="relative">
                        {inputPrefix && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{inputPrefix}</span>
                        )}
                        <input
                          type="number"
                          placeholder="No limit"
                          value={currentMax}
                          onChange={(e) => onSelect(currentMin, e.target.value)}
                          className={`w-full h-12 rounded-xl border-2 text-foreground text-[15px] bg-background transition-colors ${invalid ? 'border-red-400' : 'border-border focus:border-foreground'} ${inputPrefix ? 'pl-7 pr-3' : inputSuffix ? 'pl-3 pr-10' : 'px-3'}`}
                        />
                        {inputSuffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{inputSuffix}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {invalid && (
                    <p className="text-[12px] text-red-500 mb-1">Min can't be greater than max</p>
                  )}
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  filters: ActiveFilters
  neighborhoods?: string[]
  selectedCities?: string[]
  listings?: Listing[]
  onChange: (f: ActiveFilters) => void
  onClose: () => void
  onReset: () => void
}

export default function FiltersSheet({ open, filters, selectedCities = [], listings, onChange, onClose, onReset }: Props) {
  const citiesForNeighborhoods = selectedCities.length > 0
    ? selectedCities
    : Object.keys(CURATED_NEIGHBORHOODS)

  const toggleRoom = (r: number) => onChange({
    ...filters,
    rooms: filters.rooms.includes(r) ? filters.rooms.filter((x) => x !== r) : [...filters.rooms, r],
  })

  const toggleNeighborhood = (n: string) => onChange({
    ...filters,
    neighborhoods: filters.neighborhoods.includes(n)
      ? filters.neighborhoods.filter((x) => x !== n)
      : [...filters.neighborhoods, n],
  })

  const activeCount = countActiveFilters(filters)

  const matchCount = useMemo(() => {
    if (!listings) return null
    return listings.filter((l) => {
      if (filters.priceMin && l.price < parseInt(filters.priceMin)) return false
      if (filters.priceMax && l.price > parseInt(filters.priceMax)) return false
      if (filters.sizeMin && l.size < parseInt(filters.sizeMin)) return false
      if (filters.sizeMax && l.size > parseInt(filters.sizeMax)) return false
      if (filters.rooms.length > 0) {
        const matches = filters.rooms.some((r) => (r === 4 ? l.rooms >= 4 : l.rooms === r))
        if (!matches) return false
      }
      if (filters.furnished !== 'all' && l.furnished !== filters.furnished) return false
      if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(l.neighborhood)) return false
      return true
    }).length
  }, [listings, filters])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[28px] z-50 max-h-[92%] flex flex-col"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-foreground">Filters</h2>
                {activeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <button onClick={onReset} className="text-sm font-medium text-muted active:opacity-60">Reset</button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center active:opacity-60 text-foreground"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">

              {/* ── Price ── */}
              <div className="px-5 pt-5 pb-6 border-b border-border">
                <RangeSection
                  title="Price range"
                  subtitle="per month"
                  presets={PRICE_PRESETS}
                  currentMin={filters.priceMin}
                  currentMax={filters.priceMax}
                  onSelect={(min, max) => onChange({ ...filters, priceMin: min, priceMax: max })}
                  inputPrefix="€"
                />
              </div>

              {/* ── Size ── */}
              <div className="px-5 pt-5 pb-6 border-b border-border">
                <RangeSection
                  title="Size"
                  subtitle="square metres"
                  presets={SIZE_PRESETS}
                  currentMin={filters.sizeMin}
                  currentMax={filters.sizeMax}
                  onSelect={(min, max) => onChange({ ...filters, sizeMin: min, sizeMax: max })}
                  inputSuffix=" m²"
                />
              </div>

              {/* ── Rooms ── */}
              <div className="px-5 pt-5 pb-6 border-b border-border">
                <p className="text-[15px] font-bold text-foreground mb-4">Rooms</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => toggleRoom(r)}
                      className={`flex-1 h-12 rounded-2xl text-sm font-semibold border-2 transition-all active:scale-[0.97] ${
                        filters.rooms.includes(r)
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-foreground border-border'
                      }`}
                    >
                      {r === 4 ? '4+' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Furnishing ── */}
              <div className="px-5 pt-5 pb-6 border-b border-border">
                <p className="text-[15px] font-bold text-foreground mb-4">Furnishing</p>
                <div className="grid grid-cols-2 gap-2">
                  {FURNISHED_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => onChange({ ...filters, furnished: value })}
                      className={`flex flex-col items-start px-4 py-3 rounded-2xl border-2 text-left transition-all active:scale-[0.97] ${
                        filters.furnished === value
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-foreground border-border'
                      }`}
                    >
                      <span className="text-[14px] font-semibold">{label}</span>
                      <span className={`text-[11px] mt-0.5 ${filters.furnished === value ? 'text-background/70' : 'text-muted'}`}>
                        {desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Neighbourhoods grouped by city ── */}
              <div className="px-5 pt-5 pb-8">
                <p className="text-[15px] font-bold text-foreground">Neighbourhood</p>
                <p className="text-[12px] text-muted mt-1 mb-5">
                  Not sure where to live? Pick an area that sounds right for you.
                </p>

                {citiesForNeighborhoods
                  .filter((city) => CURATED_NEIGHBORHOODS[city]?.length)
                  .map((city) => (
                    <div key={city} className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-[13px] font-bold text-foreground whitespace-nowrap">{city}</p>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CURATED_NEIGHBORHOODS[city].map(({ name, emoji }) => {
                          const selected = filters.neighborhoods.includes(name)
                          return (
                            <button
                              key={name}
                              onClick={() => toggleNeighborhood(name)}
                              className={`flex items-center gap-1.5 h-9 px-3 rounded-full border-2 text-[13px] font-medium transition-all active:scale-[0.97] ${
                                selected
                                  ? 'bg-foreground text-background border-foreground'
                                  : 'bg-background text-foreground border-border'
                              }`}
                            >
                              <span className="text-[12px]">{emoji}</span>
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Apply */}
            <div className="px-5 pt-3 pb-6 flex-shrink-0 border-t border-border bg-background">
              <button
                onClick={onClose}
                className={`w-full h-14 rounded-2xl text-[15px] font-semibold active:scale-[0.98] active:opacity-80 transition-all ${
                  matchCount === 0
                    ? 'bg-red-500 text-white'
                    : 'bg-foreground text-background'
                }`}
              >
                {matchCount !== null
                  ? matchCount === 0
                    ? 'No listings match'
                    : `Show ${matchCount} listing${matchCount !== 1 ? 's' : ''}`
                  : activeCount > 0
                    ? `Apply ${activeCount} filter${activeCount !== 1 ? 's' : ''}`
                    : 'Show all listings'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
