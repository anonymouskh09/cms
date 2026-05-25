export function AssignmentStatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-800',
    closed: 'bg-red-100 text-red-800',
    submitted: 'bg-blue-100 text-blue-800',
    not_submitted: 'bg-yellow-100 text-yellow-800',
    missing: 'bg-red-100 text-red-800',
    late: 'bg-orange-100 text-orange-800',
    graded: 'bg-purple-100 text-purple-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };
  const label = (status || '').replace(/_/g, ' ');
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}

export function DueDateBadge({ dueDate }) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  let cls = 'bg-blue-100 text-blue-800';
  let text = `Due ${due.toLocaleDateString()}`;
  if (diffDays < 0) { cls = 'bg-red-100 text-red-800'; text = `Overdue ${due.toLocaleDateString()}`; }
  else if (diffDays <= 2) { cls = 'bg-orange-100 text-orange-800'; text = `Due soon: ${due.toLocaleDateString()}`; }
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>{text}</span>;
}
