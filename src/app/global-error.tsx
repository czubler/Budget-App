'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 flex items-center justify-center min-h-screen">
        <div className="text-center px-4">
          <p className="text-5xl mb-4">💥</p>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Critical error</h1>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            {error.message || 'The app encountered a fatal error.'}
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  )
}
