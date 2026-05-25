import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { reportCardsService, parentsService, downloadBlob } from '../../services/authService';

export default function ParentChildReportCardPage() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    parentsService.getChildren()
      .then((r) => {
        setChildren(r.data.data);
        if (r.data.data.length) setSelected(String(r.data.data[0].id));
      })
      .catch(() => setErr('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    reportCardsService.parentChild(selected)
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Could not load child report cards'))
      .finally(() => setLoading(false));
  }, [selected]);

  const handleDownload = async (id) => {
    setDownloading(id);
    setErr('');
    try {
      const res = await reportCardsService.download(id);
      downloadBlob(res.data, `report_card_${id}.pdf`);
    } catch {
      setErr('Download failed. Report card may not be published yet.');
    } finally {
      setDownloading(null);
    }
  };

  const childName = children.find((c) => String(c.id) === selected);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Child Report Cards</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {children.length > 1 && (
        <Card className="mb-6">
          <Select label="Select Child" value={selected} onChange={(e) => setSelected(e.target.value)}
            options={children.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} />
        </Card>
      )}
      {loading ? <Spinner /> : data?.report_cards?.length ? (
        <>
          {childName && (
            <p className="text-gray-600 mb-4">Published report cards for {childName.first_name} {childName.last_name || ''}</p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {data.report_cards.map((rc) => (
              <Card key={rc.id}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{rc.exam_name}</h3>
                    <p className="text-sm text-gray-500">{rc.exam_type_name}</p>
                  </div>
                  <ExamStatusBadge status={rc.status} />
                </div>
                <p className="text-sm text-gray-600 mb-1">Grade: <strong>{rc.grade}</strong></p>
                <p className="text-sm text-gray-600 mb-1">Marks: {rc.obtained_marks} / {rc.total_marks} ({rc.percentage}%)</p>
                <p className="text-sm text-gray-600 mb-4">Result: {rc.percentage >= 33 ? 'Pass' : 'Fail'}</p>
                <Button onClick={() => handleDownload(rc.id)} disabled={downloading === rc.id}>
                  {downloading === rc.id ? 'Downloading…' : 'Download PDF'}
                </Button>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState message="No published report cards for this child yet." />
      )}
    </DashboardLayout>
  );
}
