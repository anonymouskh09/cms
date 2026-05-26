import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Card, Table, Spinner } from '../../components/ui';
import { academicService } from '../../services/authService';
import { useMonitoring } from '../monitoring/MonitoringContext';

export default function PrincipalPortalClassesPage() {
  const { scopeParams, showBanner } = useMonitoring();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicService.classes.list(scopeParams).then((res) => setClasses(res.data.data)).finally(() => setLoading(false));
  }, [scopeParams.institution_id]);

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <h1 className="text-2xl font-bold mb-6">Classes</h1>
      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: 'name', label: 'Class' },
            { key: 'level', label: 'Level' },
            { key: 'status', label: 'Status' },
          ]}
          data={classes}
        />
      )}
    </DashboardLayout>
  );
}
