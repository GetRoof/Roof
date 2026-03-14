import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Plus, Trash2, MapPin, Home } from 'lucide-react'
import BottomNav from '../../components/layout/BottomNav'
import AlertSheet from '../../components/ui/AlertSheet'
import ListingModal from '../../components/ui/ListingModal'
import SourceBadge from '../../components/ui/SourceBadge'
import { useAlerts, alertMatchesListing } from '../../context/AlertsContext'
import { useOnboarding } from '../../context/OnboardingContext'
import { Listing } from '../../data/listings'
import { useListings } from '../../context/ListingsContext'

export default function AlertsPage() {
  const { alerts, addAlert, removeAlert, unreadCount, markAllRead } = useAlerts()
  const { data } = useOnboarding()
  const { listings } = useListings()
  const [showSheet, setShowSheet] = useState(false)
  const [activeListing, setActiveListing] = useState<Listing | null>(null)

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  // Unique new listings matching any alert
  const notifications = listings.filter(
    (l) => l.isNew && alerts.some((a) => alertMatchesListing(a, l)),
  )

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
            <p className="text-sm text-muted mt-1">
              {alerts.length > 0
                ? `${alerts.length} active alert${alerts.length !== 1 ? 's' : ''}`
                : 'Get notified for new listings'}
            </p>
          </div>
          <button
            onClick={() => setShowSheet(true)}
            className="flex items-center gap-1.5 h-9 px-4 bg-foreground text-white rounded-full text-sm font-semibold active:opacity-75 transition-opacity"
          >
            <Plus size={14} strokeWidth={2.5} />
            New
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="w-16 h-16 bg-secondary rounded-3xl flex items-center justify-center">
            <Bell size={28} strokeWidth={1.5} className="text-muted" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No alerts yet</h3>
            <p className="text-sm text-muted leading-relaxed">
              Create an alert and we'll notify you instantly when new listings matching your criteria are posted.
            </p>
          </div>
          <button
            onClick={() => setShowSheet(true)}
            className="flex items-center gap-2 h-12 px-6 bg-foreground text-white rounded-full text-[15px] font-semibold active:opacity-75 transition-opacity"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create your first alert
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Notification feed */}
          {notifications.length > 0 && (
            <div className="border-b border-border">
              <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {notifications.length} new match{notifications.length !== 1 ? 'es' : ''}
                </p>
              </div>
              {notifications.map((listing, i) => (
                <motion.button
                  key={listing.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setActiveListing(listing)}
                  className="w-full flex items-center gap-3 px-5 py-3 active:bg-secondary transition-colors"
                >
                  <img
                    src={listing.image}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-foreground truncate">
                        {listing.neighborhood}
                      </p>
                      <span className="flex-shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        New
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted">
                      <span className="font-semibold text-foreground">
                        €{listing.price.toLocaleString()}/mo
                      </span>
                      <span>·</span>
                      <span>{listing.type}</span>
                      <span>·</span>
                      <span>{listing.size}m²</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <SourceBadge source={listing.source} />
                    <span className="text-[11px] text-muted">{listing.postedAt}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Alert cards */}
          <div className="px-5 pt-5 pb-24">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Your alerts
            </p>
            <AnimatePresence mode="popLayout">
              {alerts.map((alert, i) => {
                const matchCount = listings.filter((l) => alertMatchesListing(alert, l)).length
                const newCount = listings.filter(
                  (l) => l.isNew && alertMatchesListing(alert, l),
                ).length

                return (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="mb-3 bg-white border border-border rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold text-foreground truncate">
                            {alert.name}
                          </p>
                          {newCount > 0 && (
                            <span className="flex-shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {newCount} new
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {alert.cities.map((city) => (
                            <span
                              key={city}
                              className="flex items-center gap-1 px-2.5 h-7 bg-secondary rounded-full text-[12px] font-medium text-foreground"
                            >
                              <MapPin size={10} strokeWidth={2} />
                              {city}
                            </span>
                          ))}
                          {alert.housingType !== 'all' && (
                            <span className="flex items-center gap-1 px-2.5 h-7 bg-secondary rounded-full text-[12px] font-medium text-foreground">
                              <Home size={10} strokeWidth={2} />
                              {alert.housingType}
                            </span>
                          )}
                          {(alert.budgetMin > 0 || alert.budgetMax > 0) && (
                            <span className="px-2.5 h-7 bg-secondary rounded-full text-[12px] font-medium text-foreground flex items-center">
                              {alert.budgetMin > 0 && alert.budgetMax > 0
                                ? `€${alert.budgetMin.toLocaleString()}–€${alert.budgetMax.toLocaleString()}`
                                : alert.budgetMax > 0
                                ? `≤ €${alert.budgetMax.toLocaleString()}`
                                : `≥ €${alert.budgetMin.toLocaleString()}`}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-muted mt-2">
                          {matchCount} listing{matchCount !== 1 ? 's' : ''} match
                          {matchCount === 1 ? 'es' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="w-8 h-8 flex-shrink-0 bg-secondary rounded-full flex items-center justify-center active:opacity-60"
                      >
                        <Trash2 size={14} strokeWidth={1.8} className="text-muted" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      <BottomNav />

      <AlertSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        onSave={addAlert}
        initialCities={data.cities ?? []}
      />

      <ListingModal listing={activeListing} onClose={() => setActiveListing(null)} />
    </div>
  )
}
