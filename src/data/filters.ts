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

export const ROOM_OPTIONS = [1, 2, 3, 4] as const // 4 = 4+

export const SIZE_PRESETS = [
  { label: '< 20m\u00B2', min: '', max: '20' },
  { label: '20\u201340m\u00B2', min: '20', max: '40' },
  { label: '40\u201360m\u00B2', min: '40', max: '60' },
  { label: '60\u201380m\u00B2', min: '60', max: '80' },
  { label: '80m\u00B2+', min: '80', max: '' },
] as const

export const FURNISHED_OPTIONS: { value: ActiveFilters['furnished']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'upholstered', label: 'Upholstered' },
]
