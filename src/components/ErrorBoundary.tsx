import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { ReactNode } from 'react'

function ErrorFallback({ resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center bg-background">
      <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
      <p className="text-sm text-muted mb-6">An unexpected error occurred. Please try again.</p>
      <button
        onClick={resetErrorBoundary}
        className="h-12 px-6 bg-foreground text-background rounded-full text-[15px] font-semibold active:opacity-75 transition-opacity"
      >
        Reload
      </button>
    </div>
  )
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      {children}
    </ReactErrorBoundary>
  )
}
