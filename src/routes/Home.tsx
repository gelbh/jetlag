import { Link } from 'react-router-dom'

export function Home() {
  return (
    <main className="flex min-h-full flex-col justify-between bg-slate-950 px-5 py-8">
      <div className="space-y-3 pt-[env(safe-area-inset-top)]">
        <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Jet Lag</p>
        <h1 className="text-4xl font-semibold text-slate-50">Map Companion</h1>
        <p className="max-w-md text-base text-slate-300">
          Annotate the live search map with radar circles, thermometer arrows, zones, and notes.
        </p>
      </div>

      <div className="space-y-3 pb-[env(safe-area-inset-bottom)]">
        <Link
          to="/create"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-sky-500 text-base font-semibold text-slate-950"
        >
          Create session
        </Link>
        <Link
          to="/join"
          className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-base font-semibold text-slate-100"
        >
          Join session
        </Link>
      </div>
    </main>
  )
}
