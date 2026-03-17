import type { Source } from './sources'

export { sourceColors } from './sources'

export interface Listing {
  id: string
  title: string
  neighborhood: string
  city: string
  price: number
  type: 'Private room' | 'Studio' | 'Apartment' | 'Shared room'
  size: number
  rooms: number
  furnished: 'furnished' | 'unfurnished' | 'upholstered'
  source: Source
  url: string
  image: string
  images: string[]
  availableFrom: string
  isNew: boolean
  postedAt: string
  postedAtRaw: string
  description: string
}
