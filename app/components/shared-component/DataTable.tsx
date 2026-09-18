import type { ColDef } from "ag-grid-community";
import { lazy, Suspense, useEffect, useState, type ReactElement } from "react";
import LoadingSpinner from "./LoadingSpinner";
import type { DataTableGridProps } from "./DataTableGrid";

// AG Grid (~1 MB minified) is split into its own chunk and fetched only once a
// table is actually on screen, so the admin routes paint their header and
// controls immediately instead of blocking on the grid.
// `lazy()` erases the component's generic parameter, so it is restored here —
// the runtime value is unchanged, this only keeps `rowData`/`columnDefs` in sync.
const DataTableGrid = lazy(() => import("./DataTableGrid")) as unknown as <T>(
  props: DataTableGridProps<T>,
) => ReactElement;

interface DataTableProps<T> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  rowHeight?: number;
  // When set, active column filters are saved to localStorage under this key
  // and restored when the user comes back to the page.
  stateKey?: string;
}

// Shared AG Grid table used by every "table view". Client-only: AG Grid
// measures the DOM, so it renders nothing during SSR/hydration's first pass.
function DataTable<T>({
  rowData,
  columnDefs,
  rowHeight,
  stateKey,
}: DataTableProps<T>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DataTableGrid<T>
        rowData={rowData}
        columnDefs={columnDefs}
        rowHeight={rowHeight}
        stateKey={stateKey}
      />
    </Suspense>
  );
}

export default DataTable;
