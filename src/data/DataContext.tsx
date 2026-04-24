import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadDashboardData, type DashboardData } from './dataService';

interface DataContextValue {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextValue>({
  data: null,
  loading: true,
  error: null,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData()
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDashboardData() {
  return useContext(DataContext);
}
