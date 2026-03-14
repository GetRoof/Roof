import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react'
import { Listing } from '../../data/listings'

function generateIntro(listing: Listing): string {
  const typeLabel =
    listing.type === 'Private room' ? 'room'
    : listing.type === 'Shared room' ? 'shared room'
    : listing.type === 'Studio' ? 'studio'
    : 'apartment'

  const furnishedNote =
    listing.furnished === 'furnished'
      ? ` The furnished setup is perfect for what I'm looking for.`
      : listing.furnished === 'upholstered'
      ? ` I see it's upholstered, which works well for me.`
      : ''

  return `Hi,

I came across your ${typeLabel} in ${listing.neighborhood} (€${listing.price.toLocaleString()}/mo, ${listing.size}m²) and I'm very interested.${furnishedNote}

I'd love to schedule a viewing at your earliest convenience — could you let me know your availability?

Best regards,`
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

interface Props {
  listing: Listing | null
  onClose: () => void
}

type IframeStatus = 'loading' | 'loaded' | 'blocked'

export default function ListingBrowser({ listing, onClose }: Props) {
  const [introOpen, setIntroOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [iframeStatus, setIframeStatus] = useState<IframeStatus>('loading')
  const [iframeKey, setIframeKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const intro = listing ? generateIntro(listing) : ''
  const domain = listing ? getDomain(listing.url) : ''

  // Reset iframe state when listing changes
  useEffect(() => {
    if (!listing) return
    setIframeStatus('loading')
    setIframeKey((k) => k + 1)

    // If onLoad never fires within 6s, assume blocked
    timeoutRef.current = setTimeout(() => setIframeStatus('blocked'), 6000)
    return () => clearTimeout(timeoutRef.current)
  }, [listing?.id])

  const handleIframeLoad = () => {
    clearTimeout(timeoutRef.current)
    try {
      const doc = iframeRef.current?.contentDocument
      // If we can access the document, check if it has content
      if (doc && (!doc.body || doc.body.children.length === 0)) {
        setIframeStatus('blocked')
        return
      }
      // If doc is inaccessible (SecurityError), content loaded cross-origin — success
    } catch {
      // Cross-origin = loaded correctly
    }
    setIframeStatus('loaded')
  }

  const handleIframeError = () => {
    clearTimeout(timeoutRef.current)
    setIframeStatus('blocked')
  }

  const copyIntro = async () => {
    if (!intro) return
    try {
      await navigator.clipboard.writeText(intro)
    } catch {
      // Fallback for mobile
      const ta = document.createElement('textarea')
      ta.value = intro
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reload = () => {
    setIframeStatus('loading')
    setIframeKey((k) => k + 1)
    timeoutRef.current = setTimeout(() => setIframeStatus('blocked'), 6000)
  }

  return (
    <AnimatePresence>
      {listing && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col bg-white"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        >
          {/* Browser chrome */}
          <div className="flex-shrink-0 pt-12 pb-2 px-3 bg-white border-b border-border">
            <div className="flex items-center gap-2">
              {/* Close */}
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-secondary transition-colors flex-shrink-0"
              >
                <X size={17} strokeWidth={2} />
              </button>

              {/* URL pill */}
              <div className="flex-1 bg-secondary rounded-xl h-9 flex items-center justify-center gap-1.5 px-3 overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-[13px] font-medium text-foreground truncate">{domain}</span>
              </div>

              {/* Reload */}
              <button
                onClick={reload}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-secondary transition-colors flex-shrink-0"
              >
                <RefreshCw size={15} strokeWidth={1.8} className={iframeStatus === 'loading' ? 'animate-spin text-muted' : 'text-foreground'} />
              </button>

              {/* Open externally */}
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-secondary transition-colors flex-shrink-0"
              >
                <ExternalLink size={15} strokeWidth={1.8} />
              </a>
            </div>
          </div>

          {/* AI intro card */}
          <div className="flex-shrink-0 border-b border-border bg-white">
            <button
              onClick={() => setIntroOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 active:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles size={12} className="text-white" />
                </div>
                <span className="text-[13px] font-semibold text-foreground">
                  {introOpen ? 'AI-generated intro' : 'AI intro ready · tap to expand'}
                </span>
              </div>
              {introOpen
                ? <ChevronUp size={15} strokeWidth={2} className="text-muted flex-shrink-0" />
                : <ChevronDown size={15} strokeWidth={2} className="text-muted flex-shrink-0" />
              }
            </button>

            <AnimatePresence initial={false}>
              {introOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4">
                    <div className="bg-secondary rounded-2xl p-4">
                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-line">
                        {intro}
                      </p>
                      <button
                        onClick={copyIntro}
                        className={`mt-3 flex items-center gap-2 px-4 h-9 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
                          copied
                            ? 'bg-green-500 text-white'
                            : 'bg-foreground text-white active:opacity-80'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={13} strokeWidth={2.5} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            Copy message
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Page area */}
          <div className="flex-1 relative overflow-hidden bg-secondary">
            {/* Loading shimmer */}
            <AnimatePresence>
              {iframeStatus === 'loading' && (
                <motion.div
                  className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-3"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-10 h-10 border-2 border-neutral-200 border-t-foreground rounded-full animate-spin" />
                  <p className="text-sm text-muted">Loading {domain}…</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Blocked fallback */}
            <AnimatePresence>
              {iframeStatus === 'blocked' && (
                <motion.div
                  className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-4 px-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="w-14 h-14 bg-secondary rounded-3xl flex items-center justify-center">
                    <ExternalLink size={22} strokeWidth={1.5} className="text-muted" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground mb-1">Can't load in-app</p>
                    <p className="text-sm text-muted leading-relaxed">
                      {domain} doesn't allow embedded browsing. Open it in Safari to apply.
                    </p>
                  </div>
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 h-11 bg-foreground text-white rounded-full text-sm font-semibold active:opacity-80 transition-opacity"
                  >
                    Open in browser
                    <ExternalLink size={14} />
                  </a>
                  <p className="text-xs text-muted -mt-1">
                    Your AI intro is copied and ready to paste ↑
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* iframe */}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={listing.url}
              className="w-full h-full border-0"
              title={listing.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
