export default function Loading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-3.5 w-72 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        </div>
        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-6 rounded-md bg-slate-200 dark:bg-slate-800"></div>
            </div>
            <div className="h-7 w-14 bg-slate-300 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Table / Board Skeleton */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-8 w-44 bg-slate-100 dark:bg-slate-800/80 rounded-lg"></div>
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 w-full bg-slate-100 dark:bg-slate-800/40 rounded-lg border border-[var(--border)]"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
