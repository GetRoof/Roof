import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'lg',
  children,
  fullWidth = true,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'font-medium rounded-2xl transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 select-none'

  const variants = {
    primary: 'bg-foreground text-white active:bg-neutral-800 disabled:opacity-40',
    secondary: 'bg-white text-foreground border border-foreground active:bg-neutral-50 disabled:opacity-40',
    ghost: 'bg-transparent text-foreground active:bg-neutral-100 disabled:opacity-40',
  }

  const sizes = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-5 text-sm',
    lg: 'h-14 px-6 text-[15px]',
  }

  return (
    <button
      className={`
        ${base}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
