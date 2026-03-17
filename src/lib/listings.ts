import { Listing } from '@/data/listings'
import { listingSchema } from '@/schemas/listing'
import { supabase } from '@/lib/supabase'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function isRecent(iso: string, hours = 24): boolean {
  return Date.now() - new Date(iso).getTime() < hours * 60 * 60 * 1000
}

function parseImages(row: Record<string, unknown>): string[] {
  if (row.images) {
    try {
      const parsed = typeof row.images === 'string' ? JSON.parse(row.images) : row.images
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[]
    } catch { /* fall through */ }
  }
  const single = (row.image_url as string) || ''
  return single ? [single] : []
}

export function rowToListing(row: Record<string, unknown>): Listing | null {
  const createdAt = (row.created_at as string) ?? (row.first_seen_at as string) ?? (row.last_seen_at as string) ?? new Date().toISOString()
  const raw = {
    id: row.id,
    title: row.title,
    neighborhood: (row.neighborhood as string) ?? '',
    city: row.city,
    price: row.price,
    type: (row.type as string) ?? 'Apartment',
    size: (row.size as number) ?? 0,
    rooms: (row.rooms as number) ?? 0,
    furnished: (row.furnished as string) ?? 'furnished',
    source: (row.source as string) ?? 'Pararius',
    url: row.url,
    image: (row.image_url as string) || '',
    images: parseImages(row),
    availableFrom: (row.available_from as string) ?? '',
    isNew: isRecent(createdAt, 24),
    postedAt: relativeTime(createdAt),
    postedAtRaw: createdAt,
    description: (row.description as string) ?? '',
  }
  const result = listingSchema.safeParse(raw)
  return result.success ? result.data : null
}

/**
 * Interleave listings so sources are blended rather than clustered.
 * Groups by 6-hour time window, then round-robins sources within each window.
 */
export function blendListings(rows: Listing[]): Listing[] {
  const WINDOW_MS = 6 * 60 * 60 * 1000
  const windows = new Map<number, Listing[]>()
  for (const r of rows) {
    const t = new Date(r.postedAtRaw).getTime()
    const bucket = Math.floor(t / WINDOW_MS)
    if (!windows.has(bucket)) windows.set(bucket, [])
    windows.get(bucket)!.push(r)
  }

  const result: Listing[] = []
  const sortedBuckets = [...windows.keys()].sort((a, b) => b - a)
  for (const bucket of sortedBuckets) {
    const group = windows.get(bucket)!
    const bySource = new Map<string, Listing[]>()
    for (const l of group) {
      if (!bySource.has(l.source)) bySource.set(l.source, [])
      bySource.get(l.source)!.push(l)
    }
    const sources = [...bySource.keys()]
    let added = true
    while (added) {
      added = false
      for (const src of sources) {
        const arr = bySource.get(src)!
        if (arr.length > 0) {
          result.push(arr.shift()!)
          added = true
        }
      }
    }
  }
  return result
}

export async function fetchFromSupabase(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (data && !error) {
    const listings: Listing[] = []
    for (const row of data) {
      const listing = rowToListing(row as Record<string, unknown>)
      if (listing) listings.push(listing)
    }
    return blendListings(listings)
  }
  return []
}
