import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { parentsService } from '../services/authService';

export function useParentChild() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    parentsService.getChildren()
      .then((r) => setChildren(r.data.data || []))
      .catch(() => setErr('Failed to load linked children'))
      .finally(() => setLoading(false));
  }, []);

  const activeChild = useMemo(
    () => children.find((c) => String(c.id) === String(studentId)),
    [children, studentId]
  );

  const institutionIds = useMemo(
    () => new Set(children.map((c) => c.institution_id)),
    [children]
  );
  const hasMultipleInstitutions = institutionIds.size > 1;

  useEffect(() => {
    if (loading || !studentId || !children.length) return;
    if (!activeChild) {
      navigate('/parent/children', { replace: true });
    }
  }, [loading, studentId, children, activeChild, navigate]);

  const switchChild = (newId) => {
    const match = location.pathname.match(/^\/parent\/child\/[^/]+\/(.+)$/);
    const section = match?.[1] || 'timetable';
    navigate(`/parent/child/${newId}/${section}`);
  };

  return {
    children,
    activeChild,
    studentId,
    loading,
    err,
    setErr,
    switchChild,
    hasMultipleInstitutions,
  };
}

export default useParentChild;
