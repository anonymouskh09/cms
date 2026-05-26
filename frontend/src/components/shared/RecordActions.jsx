import { Button } from '../ui';

export function stopRowClick(e) {
  e.stopPropagation();
}

export default function RecordActions({ onEdit, onDelete }) {
  return (
    <div className="flex gap-2" onClick={stopRowClick} onKeyDown={stopRowClick} role="presentation">
      <Button size="sm" variant="secondary" onClick={(e) => { stopRowClick(e); onEdit(); }}>Edit</Button>
      <Button size="sm" variant="danger" onClick={(e) => { stopRowClick(e); onDelete(); }}>Delete</Button>
    </div>
  );
}
