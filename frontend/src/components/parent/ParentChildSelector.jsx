import { Select } from '../ui';

export default function ParentChildSelector({
  children,
  activeChild,
  onSwitch,
  hasMultipleInstitutions,
  loading,
}) {
  if (loading) return null;
  if (!children.length) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 mb-6">
        No linked children found. Contact the school to link your account.
      </div>
    );
  }

  const label = (c) => {
    let text = `${c.first_name} ${c.last_name || ''}`.trim();
    if (c.class_name) text += ` · ${c.class_name}`;
    if (hasMultipleInstitutions && c.institution_name) text += ` (${c.institution_name})`;
    return text;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <Select
            label={children.length > 1 ? 'Select Child' : 'Viewing Child'}
            value={activeChild ? String(activeChild.id) : ''}
            onChange={(e) => onSwitch(e.target.value)}
            className="!mb-0"
            options={children.map((c) => ({ value: c.id, label: label(c) }))}
          />
        </div>
        {activeChild && (
          <div className="text-sm text-gray-600 pb-2">
            {hasMultipleInstitutions && activeChild.institution_name && (
              <span className="inline-block px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mr-2">
                {activeChild.institution_name}
              </span>
            )}
            {activeChild.section_name && <span>{activeChild.section_name}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
