import { createContext, useContext } from 'react';

export const OwnerFilterContext = createContext({
  institutionId: null,
  setInstitutionId: () => {},
});

export function useOwnerFilter() {
  const ctx = useContext(OwnerFilterContext);
  const institutionId = ctx.institutionId ? parseInt(ctx.institutionId, 10) : null;
  const queryParams = institutionId ? { institution_id: institutionId } : {};
  return { institutionId, queryParams, setInstitutionId: ctx.setInstitutionId };
}
