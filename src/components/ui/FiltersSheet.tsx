import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { ALL_NEIGHBORHOODS } from '../../data/listings'

export interface ActiveFilters {
  sizeMin: string
  sizeMax: string
  rooms: number[]       // empty = any; [4] means 4+
  neighborhoods: string[]
  furnished: 'all' | 'furnished' | 'unfurnished' | 'upholstered'
}

export const DEFAULT_FILTERS: ActiveFilters = {
  sizeMin: '',
  sizeMax: '',
  rooms: [],
  neighborhoods: [],
  furnished: 'all',
}

export function countActiveFilters(f: ActiveFilters): number {
  let n = 0
  if (f.sizeMin || f.sizeMax) n++
  if (f.rooms.length > 0) n++
  if (f.neighborhoods.length > 0) n++
  if (f.furnished !== 'all') n++
  return n
}

interface Props {
  open: boolean
  filters: ActiveFilters
  onChange: (f: ActiveFilters) => void
  onClose: () => void
  onReset: () => void
}

const ROOM_OPTIONS = [1, 2, 3, 4] // 4 = 4+

const FURNISHED_OPTIONS: { value: ActiveFilters['furnished']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'upholstered', label: 'Upholstered' },
]

export default function FiltersSheet({ open, filters, onChange, onClose, onReset }: Props) {
  const toggleRoom = (r: number) => {
    onChange({
      ...filters,
      rooms: filters.rooms.includes(r)
        ? filters.rooms.filter((x) => x !== r)
        : [...filters.rooms, r],
    })
  }

  const toggleNeighborhood = (n: string) => {
    onChange({
      ...filters,
      neighborhoods: filters.neighborhoods.includes(n)
        ? filters.neighborhoods.filter((x) => x !== n)
        : [...filters.neighborhoods, n],
    })
  }

  const activeCount = countActiveFilters(filters)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-50 max-h-[88%] flex flex-col"
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
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-foreground">Filters</h2>
                {activeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <button
                    onClick={onReset}
                    className="text-sm font-medium text-muted active:opacity-60"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center active:opacity-60"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">

              {/* Size */}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Size (m²)</p>
                {/* Presets */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { label: '< 20m²', min: '', max: '20' },
                    { label: '20–40m²', min: '20', max: '40' },
                    { label: '40–60m²', min: '40', max: '60' },
                    { label: '60–80m²', min: '60', max: '80' },
                    { label: '80m²+', min: '80', max: '' },
                  ].map(({ label, min, max }) => {
                    const active = filters.sizeMin === min && filters.sizeMax === max
                    return (
                      <button
                        key={label}
                        onClick={() => onChange({ ...filters, sizeMin: active ? '' : min, sizeMax: active ? '' : max })}
                        className={`px-3 h-9 rounded-full text-sm font-medium border transition-all active:scale-[0.98] ${
                          active
                            ? 'bg-foreground text-white border-foreground'
                            : 'bg-white text-foreground border-border'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {/* Custom inputs */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1.5">Min</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.sizeMin}
                        onChange={(e) => onChange({ ...filters, sizeMin: e.target.value })}
                        className="w-full h-12 px-3 pr-8 rounded-xl border border-border text-foreground text-[15px] bg-white focus:border-foreground transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">m²</span>
                    </div>
                  </div>
                  <div className="flex items-end pb-0.5 text-muted">—</div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1.5">Max</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="∞"
                        value={filters.sizeMax}
                        onChange={(e) => onChange({ ...filters, sizeMax: e.target.value })}
                        className="w-full h-12 px-3 pr-8 rounded-xl border border-border text-foreground text-[15px] bg-white focus:border-foreground transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">m²</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rooms */}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Number of rooms</p>
                <div className="flex gap-2">
                  {ROOM_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => toggleRoom(r)}
                      className={`flex-1 h-11 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] ${
                        filters.rooms.includes(r)
                          ? 'bg-foreground text-white border-foreground'
                          : 'bg-white text-foreground border-border'
                      }`}
                    >
                      {r === 4 ? '4+' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Furnished */}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Furnishing</p>
                <div className="flex flex-wrap gap-2">
                  {FURNISHED_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => onChange({ ...filters, furnished: value })}
                      className={`px-4 h-10 rounded-full text-sm font-medium border transition-all active:scale-[0.98] ${
                        filters.furnished === value
                          ? 'bg-foreground text-white border-foreground'
                          : 'bg-white text-foreground border-border'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Neighborhood */}
              <div className="px-5 py-5 pb-8">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Neighborhood</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_NEIGHBORHOODS.map((n) => (
                    <button
                      key={n}
                      onClick={() => toggleNeighborhood(n)}
                      className={`px-3 h-9 rounded-full text-sm font-medium border transition-all active:scale-[0.98] ${
                        filters.neighborhoods.includes(n)
                          ? 'bg-foreground text-white border-foreground'
                          : 'bg-white text-foreground border-border'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply button */}
            <div className="px-5 pt-3 pb-6 flex-shrink-0 border-t border-border bg-white">
              <button
                onClick={onClose}
                className="w-full h-14 bg-foreground text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] active:bg-neutral-800 transition-all"
              >
                {activeCount > 0 ? `Apply ${activeCount} filter${activeCount !== 1 ? 's' : ''}` : 'Apply filters'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
