import { useLocation, useNavigate } from 'react-router';

export function useWorkDialog(...keys: string[]) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const state = location.state as { openedWorkFrom?: string } | null;
  const openedHere = state?.openedWorkFrom === location.pathname;

  function update(values: Record<string, string>, replace: boolean) {
    const next = new URLSearchParams(location.search);
    keys.forEach((key) => next.delete(key));
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    const search = next.toString();
    navigate(
      { pathname: location.pathname, search: search ? '?' + search : '', hash: location.hash },
      { replace, state: replace ? state : { ...state, openedWorkFrom: location.pathname } },
    );
  }

  function closeWork() {
    if (openedHere) navigate(-1);
    else update({}, true);
  }

  return {
    params,
    openedHere,
    openWork: (values: Record<string, string>) => update(values, false),
    changeWork: (values: Record<string, string>) => update(values, true),
    closeWork,
  };
}
