type Source = 'Pararius' | 'Kamernet' | 'Huurwoningen' | 'Funda' | 'HousingAnywhere' | 'DirectWonen' | 'Rentola' | 'Kamer.nl' | 'Huurstunt' | '123Wonen'

const BADGE_STYLES: Record<Source, { bg: string; text: string }> = {
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

export default function SourceBadge({ source }: { source: Source }) {
  const style = BADGE_STYLES[source] ?? { bg: 'bg-secondary', text: 'text-muted' }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {source}
    </span>
  )
}
