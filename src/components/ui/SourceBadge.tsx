import { sourceColors } from '../../data/listings'
type Source = 'Pararius' | 'Kamernet' | 'Huurwoningen' | 'Funda'

export default function SourceBadge({ source }: { source: Source }) {
  const color = sourceColors[source]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-white text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: color }}
    >
      {source}
    </span>
  )
}
