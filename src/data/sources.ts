export type Source =
  | 'Pararius'
  | 'Kamernet'
  | 'Huurwoningen'
  | 'Funda'
  | 'HousingAnywhere'
  | 'DirectWonen'
  | 'Rentola'
  | 'Kamer.nl'
  | 'Huurstunt'
  | '123Wonen'

export const sourceColors: Record<Source, string> = {
  Pararius: '#1B4FFF',
  Kamernet: '#E84B3C',
  Huurwoningen: '#00B090',
  Funda: '#F97316',
  HousingAnywhere: '#7C3AED',
  DirectWonen: '#0891B2',
  Rentola: '#D946EF',
  'Kamer.nl': '#F59E0B',
  Huurstunt: '#14B8A6',
  '123Wonen': '#6366F1',
}

export const SOURCE_BADGE_STYLES: Record<Source, { bg: string; text: string }> = {
  Pararius:        { bg: 'bg-blue-50 dark:bg-blue-950',       text: 'text-blue-700 dark:text-blue-300'       },
  Kamernet:        { bg: 'bg-red-50 dark:bg-red-950',         text: 'text-red-700 dark:text-red-300'         },
  Huurwoningen:    { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
  Funda:           { bg: 'bg-orange-50 dark:bg-orange-950',   text: 'text-orange-700 dark:text-orange-300'   },
  HousingAnywhere: { bg: 'bg-purple-50 dark:bg-purple-950',   text: 'text-purple-700 dark:text-purple-300'   },
  DirectWonen:     { bg: 'bg-cyan-50 dark:bg-cyan-950',       text: 'text-cyan-700 dark:text-cyan-300'       },
  Rentola:         { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  'Kamer.nl':      { bg: 'bg-amber-50 dark:bg-amber-950',     text: 'text-amber-700 dark:text-amber-300'     },
  Huurstunt:       { bg: 'bg-teal-50 dark:bg-teal-950',       text: 'text-teal-700 dark:text-teal-300'       },
  '123Wonen':      { bg: 'bg-indigo-50 dark:bg-indigo-950',   text: 'text-indigo-700 dark:text-indigo-300'   },
}

export const SOURCE_BADGE_BG: Record<Source, string> = Object.fromEntries(
  Object.entries(SOURCE_BADGE_STYLES).map(([k, v]) => [k, v.bg]),
) as Record<Source, string>

export const SOURCE_COLORS_COMBINED: Record<Source, string> = Object.fromEntries(
  Object.entries(SOURCE_BADGE_STYLES).map(([k, v]) => [k, `${v.bg} ${v.text}`]),
) as Record<Source, string>
