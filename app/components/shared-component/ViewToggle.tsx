import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ViewMode } from "~/hooks/useViewMode";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

// Chip-style segmented switch between card and table view.
function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const options: { key: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { key: "card", label: "Card", icon: LayoutGrid },
    { key: "table", label: "Table", icon: Table2 },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-borderColor bg-white p-1",
        className
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.key)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primaryColor text-white"
                : "text-textLightColor hover:bg-gray-100"
            )}
          >
            <Icon size={14} />
            <span className="uppercase">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ViewToggle;
