interface ShareCodeProps {
  code: string
  remote?: boolean
}

export function ShareCode({ code, remote = false }: ShareCodeProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-center backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session code</p>
      <p className="mt-1 text-3xl font-bold tracking-[0.35em] text-sky-300">{code}</p>
      <p className="mt-2 text-xs text-slate-400">
        {remote ? 'Share with other seekers to sync live.' : 'Local-only session for solo play.'}
      </p>
    </div>
  )
}
