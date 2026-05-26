import { createContext, useContext } from 'react';

export const MonitoringContext = createContext({
  basePath: '/principal-portal',
  scopeParams: {},
  readOnly: false,
  showBanner: false,
});

export function useMonitoring() {
  return useContext(MonitoringContext);
}

export function mergeScope(scopeParams, params = {}) {
  if (!scopeParams?.institution_id) return { ...params };
  return { ...params, institution_id: scopeParams.institution_id };
}
