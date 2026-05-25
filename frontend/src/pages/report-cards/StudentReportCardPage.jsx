import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { reportCardsService, downloadBlob } from '../../services/authService';

export default function StudentReportCardPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    reportCardsService.studentMe()
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Could not load report cards'))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">My Report Card</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : data?.report_cards?.length ? (
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
              <p className="text-sm text-gray-600 mb-4">Result: {rc.pass_fail || (rc.percentage >= 33 ? 'Pass' : 'Fail')}</p>
              <Button onClick={() => handleDownload(rc.id)} disabled={downloading === rc.id}>
                {downloading === rc.id ? 'Downloading…' : 'Download PDF'}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No published report cards available yet." />
      )}
    </DashboardLayout>
  );
}
