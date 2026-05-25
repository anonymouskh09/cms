import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui';

export default function PlaceholderPage({ title, message }) {
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <Card>
        <p className="text-gray-500 text-center py-12">{message || 'This feature is coming soon. Phase 1 placeholder.'}</p>
      </Card>
    </DashboardLayout>
  );
}
