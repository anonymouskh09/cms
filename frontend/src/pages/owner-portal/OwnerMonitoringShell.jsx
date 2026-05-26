import { MonitoringContext } from '../monitoring/MonitoringContext';
import { useOwnerFilter } from '../../context/OwnerFilterContext';

export default function OwnerMonitoringShell({ children }) {
  const { queryParams } = useOwnerFilter();
  return (
    <MonitoringContext.Provider
      value={{
        basePath: '/owner',
        scopeParams: queryParams,
        readOnly: true,
        showBanner: true,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}
