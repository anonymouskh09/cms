import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Spinner } from '../../components/ui';
import { parentsService } from '../../services/authService';

export default function ParentLegacyRedirect({ section = 'timetable' }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    parentsService.getChildren()
      .then((r) => {
        const id = r.data.data?.[0]?.id;
        setTarget(id ? `/parent/child/${id}/${section}` : '/parent/children');
      })
      .catch(() => setTarget('/parent/children'));
  }, [section]);

  if (!target) return <DashboardLayout><Spinner /></DashboardLayout>;
  return <Navigate to={target} replace />;
}
