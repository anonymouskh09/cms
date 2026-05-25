export function ExamStatusBadge({ status }) {
  const styles = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    conducted: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
