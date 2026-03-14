import { useState, useRef } from 'react'
import { AnimatePresence, useScroll } from 'framer-motion'
import { Heart } from 'lucide-react'
import BottomNav from '../../components/layout/BottomNav'
import { useSaved } from '../../context/SavedContext'
import { useViewed } from '../../context/ViewedContext'
import { Listing } from '../../data/listings'
import { useListings } from '../../context/ListingsContext'
import ListingCard from '../../components/ui/ListingCard'
import ListingModal from '../../components/ui/ListingModal'

export default function LikedPage() {
  const { savedIds, toggleSave, isSaved } = useSaved()
  const { listings } = useListings()
  const { isViewed, markViewed } = useViewed()
  const [activeListing, setActiveListing] = useState<Listing | null>(null)
  const saved = listings.filter((l) => savedIds.has(l.id))

  const feedRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: feedRef })

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-shrink-0 px-5 pt-14 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Saved</h1>
        <p className="text-sm text-muted mt-1">
          {saved.length > 0
            ? `${saved.length} listing${saved.length !== 1 ? 's' : ''} saved`
            : "Listings you've saved for later"}
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="w-16 h-16 bg-secondary rounded-3xl flex items-center justify-center">
            <Heart size={28} strokeWidth={1.5} className="text-muted" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nothing saved yet</h3>
            <p className="text-sm text-muted leading-relaxed">
              Tap the heart on any listing to save it here.
            </p>
          </div>
        </div>
      ) : (
        <div ref={feedRef} className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="px-5 py-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {saved.map((listing, i) => (
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
        </div>
      )}

      <BottomNav />

      <ListingModal listing={activeListing} onClose={() => setActiveListing(null)} onViewed={markViewed} />
    </div>
  )
}
