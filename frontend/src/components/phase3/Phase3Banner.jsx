export function Phase3AiBanner() {
  return (
    <div className="mb-8 p-5 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 flex flex-wrap items-center gap-4 shadow-sm">
      <span className="px-3 py-1 text-xs font-bold rounded-full bg-violet-600 text-white uppercase tracking-wide shadow-sm">
        Phase 3 AI
      </span>
      <p className="text-sm text-violet-900 flex-1 leading-relaxed">
        AI features are UI-only in Phase 3. No real AI API calls are made. Sample data is shown for demonstration.
      </p>
    </div>
  );
}

export function Phase3IntegrationBanner() {
  return (
    <div className="mb-8 p-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 flex flex-wrap items-center gap-4 shadow-sm">
      <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500 text-white uppercase tracking-wide shadow-sm">
        UI Only
      </span>
      <p className="text-sm text-amber-900 flex-1 leading-relaxed">
        This feature is UI-only in Phase 3 and is not active yet.
      </p>
    </div>
  );
}
