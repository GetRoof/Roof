import { z } from 'zod'

export const activeFiltersSchema = z.object({
  priceMin: z.string().default(''),
  priceMax: z.string().default(''),
  sizeMin: z.string().default(''),
  sizeMax: z.string().default(''),
  rooms: z.array(z.number()).default([]),
  neighborhoods: z.array(z.string()).default([]),
  furnished: z.enum(['all', 'furnished', 'unfurnished', 'upholstered']).default('all'),
})

export const alertSchema = z.object({
  id: z.string(),
  name: z.string(),
  cities: z.array(z.string()),
  housingType: z.enum(['all', 'room', 'studio', 'apartment']).default('all'),
  budgetMin: z.number().default(0),
  budgetMax: z.number().default(0),
  filters: activeFiltersSchema,
  createdAt: z.string(),
  isMain: z.boolean().optional(),
})
