import { Source, SOURCE_BADGE_STYLES } from '@/data/sources'

export default function SourceBadge({ source }: { source: Source }) {
  const style = SOURCE_BADGE_STYLES[source] ?? { bg: 'bg-secondary', text: 'text-muted' }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {source}
    </span>
  )
}
