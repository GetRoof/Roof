interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

export default function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-1 text-left"
    >
      <span className="text-[15px] text-foreground">{label}</span>
      <div
        className={`
          relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0
          ${checked ? 'bg-foreground' : 'bg-neutral-300 dark:bg-neutral-600'}
        `}
      >
        <div
          className={`
            absolute top-1 w-5 h-5 bg-background rounded-full shadow-sm transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </div>
    </button>
  )
}
