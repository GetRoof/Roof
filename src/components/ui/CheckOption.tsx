interface CheckOptionProps {
  label: string
  description?: string
  selected: boolean
  onToggle: () => void
}

export default function CheckOption({ label, description, selected, onToggle }: CheckOptionProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-start gap-3.5 w-full py-3 text-left active:opacity-70 transition-opacity"
    >
      <div
        className={`
          mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 transition-all duration-150 flex items-center justify-center
          ${selected
            ? 'border-foreground bg-foreground'
            : 'border-border bg-background'
          }
        `}
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div>
        <p className={`text-[15px] ${selected ? 'font-medium' : 'font-normal'} text-foreground`}>
          {label}
        </p>
        {description && (
          <p className="text-sm text-muted mt-0.5">{description}</p>
        )}
      </div>
    </button>
  )
}
