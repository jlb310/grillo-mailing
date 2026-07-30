export default function UnsubscribePage({ searchParams }: { searchParams: { email?: string; org?: string } }) {
  const { email, org } = searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Darse de baja</h1>
        <p className="text-neutral-500">
          Has sido dado de baja exitosamente de nuestra lista de correos.
        </p>
        {email && (
          <p className="text-sm text-neutral-400">
            Email: {email}
          </p>
        )}
      </div>
    </div>
  )
}
