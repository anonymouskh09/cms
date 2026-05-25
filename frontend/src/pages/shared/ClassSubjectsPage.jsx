import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner, EmptyState } from '../../components/ui';
import { academicService, classSubjectsService } from '../../services/authService';

export default function ClassSubjectsPage() {
  const [mappings, setMappings] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [pickedSubjectIds, setPickedSubjectIds] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      classSubjectsService.list(),
      academicService.classes.list(),
      academicService.subjects.list(),
    ])
      .then(([m, c, s]) => {
        setMappings(m.data.data || []);
        const cls = c.data.data || [];
        setClasses(cls);
        setSubjects(s.data.data || []);
        if (!selectedClassId && cls.length) {
          setSelectedClassId(String(cls[0].id));
        }
      })
      .catch(() => setErr('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const subjectsByClass = useMemo(() => {
    const map = {};
    mappings.forEach((m) => {
      const cid = String(m.class_id);
      if (!map[cid]) map[cid] = [];
      map[cid].push(m);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => String(a.subject_name).localeCompare(String(b.subject_name))));
    return map;
  }, [mappings]);

  const selectedClass = classes.find((c) => String(c.id) === String(selectedClassId));
  const assignedList = subjectsByClass[String(selectedClassId)] || [];
  const assignedSubjectIds = new Set(assignedList.map((m) => m.subject_id));

  const availableSubjects = useMemo(() => {
    return subjects
      .filter((s) => !assignedSubjectIds.has(s.id))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [subjects, assignedSubjectIds]);

  const toggleSubject = (id) => {
    setPickedSubjectIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const selectAllAvailable = () => {
    setPickedSubjectIds(availableSubjects.map((s) => s.id));
  };

  const clearPicked = () => setPickedSubjectIds([]);

  useEffect(() => {
    setPickedSubjectIds([]);
  }, [selectedClassId]);

  const handleBulkAssign = async () => {
    if (!selectedClassId || !pickedSubjectIds.length) {
      setErr('Select a class and at least one subject');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const res = await classSubjectsService.assignBulk({
        class_id: parseInt(selectedClassId, 10),
        subject_ids: pickedSubjectIds,
      });
      setMsg(res.data.message || 'Subjects assigned');
      setPickedSubjectIds([]);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to assign subjects');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this subject from class?')) return;
    try {
      await classSubjectsService.remove(id);
      setMsg('Subject removed');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Remove failed');
    }
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">Class Subjects</h2>
      <p className="text-sm text-gray-500 mb-6">
        Select a class on the left, then assign multiple subjects at once. Each class shows its own subject list.
      </p>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      {classes.length === 0 ? (
        <EmptyState message="No classes yet. Create classes first from the Classes menu." />
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-4">
            <h3 className="font-semibold mb-3 text-gray-800">All classes</h3>
            <p className="text-xs text-gray-500 mb-4">Click a class to view and manage its subjects</p>
            <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
              {classes.map((c) => {
                const count = (subjectsByClass[String(c.id)] || []).length;
                const active = String(c.id) === String(selectedClassId);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedClassId(String(c.id))}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                        active
                          ? 'border-violet-500 bg-violet-50 text-violet-900'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{c.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          count ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {count} subject{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="lg:col-span-8 space-y-6">
            {selectedClass ? (
              <>
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {selectedClass.name} — assigned subjects
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Ye subjects is class mein padhai jati hain ({assignedList.length} total)
                  </p>
                  {assignedList.length ? (
                    <ul className="divide-y border rounded-lg">
                      {assignedList.map((m) => (
                        <li key={m.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <span className="font-medium">{m.subject_name}</span>
                            {m.subject_code && (
                              <span className="text-sm text-gray-500 ml-2">({m.subject_code})</span>
                            )}
                          </div>
                          <Button size="sm" variant="danger" onClick={() => handleRemove(m.id)}>
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                      Is class ke liye abhi koi subject assign nahi. Neeche se subjects select karke assign karein.
                    </p>
                  )}
                </Card>

                <Card>
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Add subjects to {selectedClass.name}</h3>
                      <p className="text-sm text-gray-500">Ek hi baar mein jitne subjects chahiye sab select karein</p>
                    </div>
                    {availableSubjects.length > 0 && (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={selectAllAvailable}>Select all</Button>
                        <Button variant="secondary" size="sm" onClick={clearPicked}>Clear</Button>
                      </div>
                    )}
                  </div>

                  {availableSubjects.length ? (
                    <>
                      <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-4 p-2 border rounded-lg bg-gray-50">
                        {availableSubjects.map((s) => {
                          const checked = pickedSubjectIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border ${
                                checked ? 'border-violet-400 bg-violet-50' : 'border-transparent bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSubject(s.id)}
                              />
                              <span className="text-sm">
                                {s.name}
                                {s.code && <span className="text-gray-400"> ({s.code})</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <Button
                        onClick={handleBulkAssign}
                        disabled={saving || !pickedSubjectIds.length}
                      >
                        {saving
                          ? 'Assigning…'
                          : `Assign ${pickedSubjectIds.length || 0} subject(s) to ${selectedClass.name}`}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                      Saare available subjects is class ko assign ho chuke hain. Naye subject ke liye pehle Subjects menu se subject banayein.
                    </p>
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <EmptyState message="Select a class from the list." />
              </Card>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
