interface RadioOptionProps {
  label: string
  description?: string
  selected: boolean
  onSelect: () => void
}

export default function RadioOption({ label, description, selected, onSelect }: RadioOptionProps) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3.5 w-full py-3 text-left active:opacity-70 transition-opacity"
    >
      <div
        className={`
          mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all duration-150
          ${selected
            ? 'border-foreground bg-foreground'
            : 'border-neutral-300 bg-white'
          }
        `}
      >
        {selected && (
          <div className="w-full h-full rounded-full flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
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
