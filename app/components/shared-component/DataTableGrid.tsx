import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type FilterChangedEvent,
  type GridReadyEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback } from "react";

// Register the (free) community feature set once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule]);

// Match the app look: same border radius / border color family as the cards.
const appTheme = themeQuartz.withParams({
  borderRadius: 8,
  wrapperBorderRadius: 12,
  headerBackgroundColor: "#f8f9fb",
  headerFontWeight: 600,
});

export interface DataTableGridProps<T> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  rowHeight?: number;
  stateKey?: string;
}

/**
 * The actual AG Grid. Kept in its own module so `DataTable` can import it
 * dynamically — AG Grid is ~1 MB of JavaScript, and loading it eagerly made
 * every admin route wait on it before rendering anything at all.
 */
export default function DataTableGrid<T>({
  rowData,
  columnDefs,
  rowHeight,
  stateKey,
}: DataTableGridProps<T>) {
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
    [stateKey],
  );

  // Save the filter model on every change.
  const onFilterChanged = useCallback(
    (e: FilterChangedEvent) => {
      if (!stateKey) return;
      try {
        window.localStorage.setItem(
          `table-filters:${stateKey}`,
          JSON.stringify(e.api.getFilterModel() ?? {}),
        );
      } catch {
        // storage unavailable — filters just won't survive navigation
      }
    },
    [stateKey],
  );

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
