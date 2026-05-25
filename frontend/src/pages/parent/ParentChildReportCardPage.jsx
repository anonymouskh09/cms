import { useEffect, useState } from 'react';
import { Card, Button, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { reportCardsService, downloadBlob } from '../../services/authService';
import ParentChildShell from './ParentChildShell';

export default function ParentChildReportCardPage() {
  return (
    <ParentChildShell title="Child Report Card">
      {({ studentId }) => <ReportCardContent studentId={studentId} />}
    </ParentChildShell>
  );
}

function ReportCardContent({ studentId }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    reportCardsService.parentChild(studentId)
      .then((r) => setCards(r.data.data?.report_cards || []))
      .finally(() => setLoading(false));
  }, [studentId]);

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

  if (loading) return null;
  if (!cards.length) return <EmptyState message="No published report cards for this child yet." />;

  return (
    <>
      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {cards.map((rc) => (
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
  );
}
