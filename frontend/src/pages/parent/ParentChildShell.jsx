import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner } from '../../components/ui';
import ParentChildSelector from '../../components/parent/ParentChildSelector';
import ParentChildNav from '../../components/parent/ParentChildNav';
import useParentChild from '../../hooks/useParentChild';

export default function ParentChildShell({
  title,
  showNav = true,
  children: renderContent,
}) {
  const {
    children,
    activeChild,
    studentId,
    loading,
    err,
    setErr,
    switchChild,
    hasMultipleInstitutions,
  } = useParentChild();

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <ParentChildSelector
        children={children}
        activeChild={activeChild}
        onSwitch={switchChild}
        hasMultipleInstitutions={hasMultipleInstitutions}
        loading={loading}
      />
      {showNav && studentId && <ParentChildNav />}
      {loading ? <Spinner /> : renderContent({
        children,
        activeChild,
        studentId,
        loading,
        hasMultipleInstitutions,
      })}
    </DashboardLayout>
  );
}
