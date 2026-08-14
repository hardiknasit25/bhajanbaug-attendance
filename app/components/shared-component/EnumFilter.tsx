import type { IDoesFilterPassParams } from "ag-grid-community";
import {
  useGridFilter,
  type CustomFilterProps,
  type CustomFloatingFilterProps,
} from "ag-grid-react";
import { useCallback } from "react";

// Reusable AG Grid filter for columns whose values are a fixed enum (in the
// database) — offers exactly those values instead of a free-text filter.
//
// Usage on a ColDef:
//   filter: EnumFilter,
//   filterParams: { field: "user_type", options: USER_TYPE_OPTIONS },
//   floatingFilter: true,
//   floatingFilterComponent: EnumFloatingFilter,
//   floatingFilterComponentParams: { options: USER_TYPE_OPTIONS },
//
// Values are compared as strings, so boolean columns work with
// options like { value: "true", label: "Yes" }.

export interface EnumFilterOption {
  value: string;
  label: string;
}

type EnumFilterComponentProps = CustomFilterProps<any, unknown, string | null> & {
  field?: string;
  options?: EnumFilterOption[];
};

// Filter panel (funnel menu): radio list of the enum values.
export function EnumFilter({
  model,
  onModelChange,
  field,
  options = [],
}: EnumFilterComponentProps) {
  const doesFilterPass = useCallback(
    (params: IDoesFilterPassParams) => {
      if (!model || !field) return true;
      const raw = (params.data as Record<string, unknown>)?.[field];
      return String(raw ?? "") === model;
    },
    [model, field]
  );
  useGridFilter({ doesFilterPass });

  return (
    <div className="flex flex-col gap-2 p-3">
      {[{ value: "", label: "All" }, ...options].map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 text-sm text-textColor"
        >
          <input
            type="radio"
            name={`enum-filter-${field ?? "value"}`}
            checked={(model ?? "") === opt.value}
            onChange={() => onModelChange(opt.value || null)}
          />
          <span className="capitalize">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

type EnumFloatingFilterComponentProps = CustomFloatingFilterProps<
  string | null
> & {
  options?: EnumFilterOption[];
};

// Dropdown shown in the floating-filter row directly under the column header.
export function EnumFloatingFilter({
  model,
  onModelChange,
  options = [],
}: EnumFloatingFilterComponentProps) {
  return (
    <select
      value={model ?? ""}
      onChange={(e) => onModelChange(e.target.value || null)}
      className="h-full w-full rounded-md border border-borderColor bg-white px-1 text-sm text-textColor outline-none focus:border-primaryColor"
    >
      <option value="">All</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
