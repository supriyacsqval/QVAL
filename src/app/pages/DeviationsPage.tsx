import { DeviationsTable } from '../components/DeviationsTable';
import type { DateRange } from '../components/Navigation';

interface DeviationsPageProps {
  productFilter: string;
  searchQuery: string;
  dateRange?: DateRange;
}

export function DeviationsPage({ productFilter, searchQuery, dateRange }: DeviationsPageProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1">CAPA – Deviations</h1>
        <p className="text-muted-foreground">
          Corrective and preventive action records for out-of-specification batches
        </p>
      </div>
      <DeviationsTable productFilter={productFilter} searchQuery={searchQuery} dateRange={dateRange} />
    </div>
  );
}
