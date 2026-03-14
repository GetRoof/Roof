import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MapPin, Bell, Filter } from 'lucide-react'
import { useScroll } from 'framer-motion'
import { Listing } from '../../data/listings'
import { useListings } from '../../context/ListingsContext'
import BottomNav from '../../components/layout/BottomNav'
import { useSaved } from '../../context/SavedContext'
import { useViewed } from '../../context/ViewedContext'
import FiltersSheet, {
  ActiveFilters,
  DEFAULT_FILTERS,
  countActiveFilters,
} from '../../components/ui/FiltersSheet'
import CityPickerSheet from '../../components/ui/CityPickerSheet'
import ListingCard from '../../components/ui/ListingCard'
import ListingModal from '../../components/ui/ListingModal'
import PullToRefresh from '../../components/ui/PullToRefresh'
import NotificationsSheet from '../../components/ui/NotificationsSheet'

const PLATFORM_FILTERS = ['All', 'Pararius', 'Funda', 'Kamernet', 'Huurwoningen'] as const
type PlatformFilter = typeof PLATFORM_FILTERS[number]

export default function RoomsPage() {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('All')
  const [showFilters, setShowFilters] = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS)
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [activeListing, setActiveListing] = useState<Listing | null>(null)
  const { isSaved, toggleSave } = useSaved()
  const { listings, refresh } = useListings()
  const { isViewed, markViewed } = useViewed()

  const feedRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: feedRef })

  const newCount = listings.filter((l) => l.isNew).length

  // Reset scroll when any filter changes
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0
  }, [platformFilter, filters, selectedCities])

  const activeFilterCount = countActiveFilters(filters)

  const cityLabel =
    selectedCities.length === 0
      ? 'All cities'
      : selectedCities.length === 1
      ? selectedCities[0]
      : `${selectedCities[0]} +${selectedCities.length - 1}`

  const filtered = listings.filter((l) => {
    if (selectedCities.length > 0 && !selectedCities.includes(l.city)) return false
    if (platformFilter !== 'All' && l.source !== platformFilter) return false
    if (filters.sizeMin && l.size < parseInt(filters.sizeMin)) return false
    if (filters.sizeMax && l.size > parseInt(filters.sizeMax)) return false
    if (filters.rooms.length > 0) {
      const matches = filters.rooms.some((r) => (r === 4 ? l.rooms >= 4 : l.rooms === r))
      if (!matches) return false
    }
    if (filters.furnished !== 'all' && l.furnished !== filters.furnished) return false
    if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(l.neighborhood)) return false
    return true
  })

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-3 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              onClick={() => setShowCityPicker(true)}
              className="flex items-center gap-1.5 text-[15px] font-medium text-foreground active:opacity-60 transition-opacity"
            >
              <MapPin size={15} strokeWidth={2} />
              {cityLabel} <span className="text-base">🇳🇱</span>
            </button>
            <p className="text-xs text-muted mt-0.5">
              Listings from Pararius, Kamernet, Funda & more
            </p>
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 bg-secondary rounded-full flex items-center justify-center"
          >
            <Bell size={16} strokeWidth={1.8} />
            {newCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {/* Platform filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {PLATFORM_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                platformFilter === p
                  ? 'bg-foreground text-white border-foreground'
                  : 'bg-white text-foreground border-border'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setShowFilters(true)}
            className={`relative flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ml-auto transition-all ${
              activeFilterCount > 0
                ? 'bg-foreground border-foreground text-white'
                : 'border-border text-foreground'
            }`}
          >
            <Filter size={14} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground border-2 border-white text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* New listings badge */}
      <div className="px-5 pb-2 flex items-center gap-2 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-muted font-medium">
          {filtered.filter((l) => l.isNew).length} new listings today
        </span>
        {filtered.length !== listings.length && (
          <span className="text-xs text-muted">· {filtered.length} matching</span>
        )}
      </div>

      {/* Listings feed with pull-to-refresh */}
      <PullToRefresh onRefresh={refresh} scrollRef={feedRef}>
        <div className="min-h-full pb-4 flex flex-col">
          {filtered.length === 0 ? (
            <div className="flex flex-col flex-1 items-center justify-center gap-3 px-8 text-center">
              <div className="w-14 h-14 bg-secondary rounded-3xl flex items-center justify-center">
                <Filter size={22} strokeWidth={1.5} className="text-muted" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground mb-1">No listings match</p>
                <p className="text-sm text-muted">Try adjusting or resetting your filters.</p>
              </div>
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS)
                  setSelectedCities([])
                  setPlatformFilter('All')
                }}
                className="mt-1 px-5 h-10 bg-foreground text-white rounded-full text-sm font-medium"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="px-5 space-y-4 pt-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((listing, i) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    index={i}
                    onClick={() => setActiveListing(listing)}
                    isSaved={isSaved(listing.id)}
                    onToggleSave={() => toggleSave(listing.id)}
                    scrollY={scrollY}
                    isViewed={isViewed(listing.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </PullToRefresh>

      <BottomNav />

      <FiltersSheet
        open={showFilters}
        filters={filters}
        onChange={setFilters}
        onClose={() => setShowFilters(false)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <CityPickerSheet
        open={showCityPicker}
        selectedCities={selectedCities}
        onChange={setSelectedCities}
        onClose={() => setShowCityPicker(false)}
      />

      <NotificationsSheet
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        onOpenListing={(l) => { setActiveListing(l); setShowNotifications(false) }}
      />

      <ListingModal listing={activeListing} onClose={() => setActiveListing(null)} onViewed={markViewed} />
    </div>
  )
}
