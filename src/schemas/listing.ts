import { z } from 'zod'

export const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  price: z.number(),
  type: z.enum(['Private room', 'Studio', 'Apartment', 'Shared room']),
  size: z.number(),
  rooms: z.number(),
  furnished: z.enum(['furnished', 'unfurnished', 'upholstered']),
  source: z.enum([
    'Pararius', 'Kamernet', 'Huurwoningen', 'Funda', 'HousingAnywhere',
    'DirectWonen', 'Rentola', 'Kamer.nl', 'Huurstunt', '123Wonen',
  ]),
  url: z.string(),
  image: z.string(),
  images: z.array(z.string()),
  availableFrom: z.string(),
  isNew: z.boolean(),
  postedAt: z.string(),
  postedAtRaw: z.string(),
  description: z.string(),
})
