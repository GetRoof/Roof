import { z } from 'zod'

export const onboardingDataSchema = z.object({
  name: z.string().optional(),
  purposes: z.array(z.string()).optional(),
  housingType: z.string().optional(),
  country: z.string().optional(),
  cities: z.array(z.string()).optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  interests: z.array(z.string()).optional(),
  sizeMin: z.number().optional(),
  sizeMax: z.number().optional(),
  bedrooms: z.array(z.number()).optional(),
  interior: z.string().optional(),
})

export type OnboardingData = z.infer<typeof onboardingDataSchema>
