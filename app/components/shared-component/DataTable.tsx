import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type FilterChangedEvent,
  type GridReadyEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useState } from "react";

// Register the (free) community feature set once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule]);

// Match the app look: same border radius / border color family as the cards.
const appTheme = themeQuartz.withParams({
  borderRadius: 8,
  wrapperBorderRadius: 12,
  headerBackgroundColor: "#f8f9fb",
  headerFontWeight: 600,
});

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

  // Restore the saved filter model once the grid is ready.
  const onGridReady = useCallback(
    (e: GridReadyEvent) => {
      if (!stateKey) return;
      try {
        const saved = window.localStorage.getItem(`table-filters:${stateKey}`);
        if (saved) e.api.setFilterModel(JSON.parse(saved));
      } catch {
        // corrupt/unavailable storage — start with no filters
      }
    },
    [stateKey]
  );

  // Save the filter model on every change.
  const onFilterChanged = useCallback(
    (e: FilterChangedEvent) => {
      if (!stateKey) return;
      try {
        window.localStorage.setItem(
          `table-filters:${stateKey}`,
          JSON.stringify(e.api.getFilterModel() ?? {})
        );
      } catch {
        // storage unavailable — filters just won't survive navigation
      }
    },
    [stateKey]
  );

  if (!mounted) return null;

  return (
    <div className="w-full">
      <AgGridReact<T>
        theme={appTheme}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{
          sortable: true,
          resizable: true,
          flex: 1,
          minWidth: 90,
        }}
        domLayout="autoHeight"
        rowHeight={rowHeight}
        suppressCellFocus
        onGridReady={onGridReady}
        onFilterChanged={onFilterChanged}
      />
    </div>
  );
}

export default DataTable;
