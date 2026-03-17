import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

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

const PRICE_MAX = 4000
const PRICE_STEP = 50
const SIZE_MAX = 200
const SIZE_STEP = 5

const FURNISHED_OPTIONS: { value: ActiveFilters['furnished']; label: string; desc: string }[] = [
  { value: 'all',          label: 'Any',          desc: 'Show all options'    },
  { value: 'furnished',    label: 'Furnished',    desc: 'Furniture included'  },
  { value: 'unfurnished',  label: 'Unfurnished',  desc: 'Bring your own'      },
  { value: 'upholstered',  label: 'Upholstered',  desc: 'Shell + basic items' },
]

// ─── Dual range slider component ──────────────────────────────────────────────
function DualRangeSlider({
  min, max, step,
  valueMin, valueMax,
  onChangeMin, onChangeMax,
  formatMin, formatMax,
}: {
  min: number; max: number; step: number
  valueMin: number; valueMax: number
  onChangeMin: (v: number) => void
  onChangeMax: (v: number) => void
  formatMin: (v: number) => string
  formatMax: (v: number) => string
}) {
  const minPct = ((valueMin - min) / (max - min)) * 100
  const maxPct = ((valueMax - min) / (max - min)) * 100

  return (
    <div>
      {/* Value badges */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-secondary rounded-2xl px-4 py-3 text-center">
          <p className="text-[10px] text-muted font-semibold uppercase tracking-wide mb-0.5">Min</p>
          <p className="text-[16px] font-bold text-foreground">{formatMin(valueMin)}</p>
        </div>
        <div className="w-5 h-px bg-border flex-shrink-0" />
        <div className="flex-1 bg-secondary rounded-2xl px-4 py-3 text-center">
          <p className="text-[10px] text-muted font-semibold uppercase tracking-wide mb-0.5">Max</p>
          <p className="text-[16px] font-bold text-foreground">
            {formatMax(valueMax)}{valueMax >= max ? '' : ''}
          </p>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-10 flex items-center mx-3">
        <div className="absolute left-0 right-0 h-1.5 bg-border rounded-full" />
        <div
          className="absolute h-1.5 bg-foreground rounded-full pointer-events-none"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        {/* Visual handles */}
        <div
          className="absolute w-7 h-7 bg-background border-2 border-foreground rounded-full shadow-lg pointer-events-none -translate-x-1/2 z-10"
          style={{ left: `${minPct}%` }}
        />
        <div
          className="absolute w-7 h-7 bg-background border-2 border-foreground rounded-full shadow-lg pointer-events-none -translate-x-1/2 z-10"
          style={{ left: `${maxPct}%` }}
        />
        {/* Min range input */}
        <input
          type="range" min={min} max={max} step={step} value={valueMin}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), valueMax - step)
            onChangeMin(v)
          }}
          className="range-slider"
          style={{ zIndex: valueMin >= valueMax - step ? 5 : 3 }}
        />
        {/* Max range input */}
        <input
          type="range" min={min} max={max} step={step} value={valueMax}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), valueMin + step)
            onChangeMax(v)
          }}
          className="range-slider"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  filters: ActiveFilters
  neighborhoods?: string[]
  selectedCities?: string[]
  onChange: (f: ActiveFilters) => void
  onClose: () => void
  onReset: () => void
}

export default function FiltersSheet({ open, filters, selectedCities = [], onChange, onClose, onReset }: Props) {
  const citiesForNeighborhoods = selectedCities.length > 0
    ? selectedCities
    : Object.keys(CURATED_NEIGHBORHOODS)

  const priceMin = filters.priceMin ? parseInt(filters.priceMin) : 0
  const priceMax = filters.priceMax ? parseInt(filters.priceMax) : PRICE_MAX
  const sizeMin  = filters.sizeMin  ? parseInt(filters.sizeMin)  : 0
  const sizeMax  = filters.sizeMax  ? parseInt(filters.sizeMax)  : SIZE_MAX

  const setPriceMin = useCallback((v: number) => onChange({ ...filters, priceMin: v === 0        ? '' : String(v) }), [filters, onChange])
  const setPriceMax = useCallback((v: number) => onChange({ ...filters, priceMax: v >= PRICE_MAX ? '' : String(v) }), [filters, onChange])
  const setSizeMin  = useCallback((v: number) => onChange({ ...filters, sizeMin:  v === 0        ? '' : String(v) }), [filters, onChange])
  const setSizeMax  = useCallback((v: number) => onChange({ ...filters, sizeMax:  v >= SIZE_MAX  ? '' : String(v) }), [filters, onChange])

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
                <div className="flex items-baseline justify-between mb-5">
                  <p className="text-[15px] font-bold text-foreground">Price range</p>
                  <p className="text-[12px] text-muted">per month</p>
                </div>
                <DualRangeSlider
                  min={0} max={PRICE_MAX} step={PRICE_STEP}
                  valueMin={priceMin} valueMax={priceMax}
                  onChangeMin={setPriceMin} onChangeMax={setPriceMax}
                  formatMin={(v) => v === 0 ? 'Any' : `€${v.toLocaleString()}`}
                  formatMax={(v) => v >= PRICE_MAX ? 'Any' : `€${v.toLocaleString()}`}
                />
              </div>

              {/* ── Size ── */}
              <div className="px-5 pt-5 pb-6 border-b border-border">
                <div className="flex items-baseline justify-between mb-5">
                  <p className="text-[15px] font-bold text-foreground">Size</p>
                  <p className="text-[12px] text-muted">square metres</p>
                </div>
                <DualRangeSlider
                  min={0} max={SIZE_MAX} step={SIZE_STEP}
                  valueMin={sizeMin} valueMax={sizeMax}
                  onChangeMin={setSizeMin} onChangeMax={setSizeMax}
                  formatMin={(v) => v === 0 ? 'Any' : `${v} m²`}
                  formatMax={(v) => v >= SIZE_MAX ? 'Any' : `${v} m²`}
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
                className="w-full h-14 bg-foreground text-background rounded-2xl text-[15px] font-semibold active:scale-[0.98] active:opacity-80 transition-all"
              >
                {activeCount > 0 ? `Apply ${activeCount} filter${activeCount !== 1 ? 's' : ''}` : 'Show all listings'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
