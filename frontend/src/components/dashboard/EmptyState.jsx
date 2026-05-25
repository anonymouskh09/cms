export default function EmptyState({ message = 'No data found' }) {
  return (
    <div className="text-center py-14 px-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
