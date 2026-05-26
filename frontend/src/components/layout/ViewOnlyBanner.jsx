export default function ViewOnlyBanner() {
  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600">
      <span className="font-medium text-slate-800">View only</span>
      {' — '}
      You can monitor data across schools. Adding, editing, or deleting is not available for the owner account.
    </div>
  );
}
