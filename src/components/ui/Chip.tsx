interface ChipProps {
  label: string
  selected: boolean
  onToggle: () => void
}

export default function Chip({ label, selected, onToggle }: ChipProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm
        transition-all duration-150 active:scale-95 select-none
        ${selected
          ? 'bg-foreground text-background border-foreground'
          : 'bg-background text-foreground border-border'
        }
      `}
    >
      {label}
    </button>
  )
}
