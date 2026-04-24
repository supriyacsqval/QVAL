import { EntriesTable } from '../components/EntriesTable';
import { CharacteristicsPanel } from '../components/CharacteristicsPanel';
import type { DateRange } from '../components/Navigation';

interface InspectionsPageProps {
  productFilter: string;
  searchQuery: string;
  dateRange?: DateRange;
}

export function InspectionsPage({ productFilter, searchQuery, dateRange }: InspectionsPageProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1">Inspection Lots</h1>
        <p className="text-muted-foreground">
          Browse all QALS inspection lot records with characteristic results from QAMR
        </p>
      </div>
      <CharacteristicsPanel productFilter={productFilter} />
      <EntriesTable productFilter={productFilter} searchQuery={searchQuery} dateRange={dateRange} />
    </div>
  );
}
