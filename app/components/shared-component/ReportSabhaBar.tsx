import { CalendarDays, ChevronDown } from "lucide-react";
import type { ReportSabha } from "~/store/slice/reportSlice";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-18" -> "18 Sep 2026" (read as a plain date, so no timezone shift).
function formatSabhaDate(value: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || null;
  const [, year, month, day] = match;
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

const sabhaName = (s: ReportSabha) => s.title?.trim() || `Sabha #${s.id}`;

/**
 * Strip under the report tabs telling the user exactly which sabha(s) the
 * numbers on screen are for: the sabha name + date for a single sabha, or the
 * count + date range with a "View all" list for several.
 */
export default function ReportSabhaBar({
  sabhas,
  loading,
}: {
  sabhas: ReportSabha[];
  loading: boolean;
}) {
  const wrapper =
    "flex w-full items-center gap-2 border-b border-borderColor bg-eventCardColor px-4 py-2 text-sm text-textColor";

  if (loading) {
    return (
      <div className={wrapper}>
        <CalendarDays size={16} className="shrink-0 text-eventCardBorderColor" />
        <span className="text-textLightColor">Loading sabha…</span>
      </div>
    );
  }

  if (sabhas.length === 0) {
    return (
      <div className={wrapper}>
        <CalendarDays size={16} className="shrink-0 text-eventCardBorderColor" />
        <span className="text-textLightColor">No sabha in this report</span>
      </div>
    );
  }

  // Sorted oldest -> newest by the backend; re-sort defensively.
  const sorted = [...sabhas].sort((a, b) =>
    (a.sabha_date ?? "").localeCompare(b.sabha_date ?? ""),
  );

  if (sorted.length === 1) {
    const only = sorted[0];
    const date = formatSabhaDate(only.sabha_date);
    return (
      <div className={wrapper}>
        <CalendarDays size={16} className="shrink-0 text-eventCardBorderColor" />
        <span className="min-w-0 truncate">
          <span className="font-semibold">{sabhaName(only)}</span>
          {date && <span className="text-textLightColor"> · {date}</span>}
        </span>
      </div>
    );
  }

  const from = formatSabhaDate(sorted[0].sabha_date);
  const to = formatSabhaDate(sorted[sorted.length - 1].sabha_date);

  return (
    <div className={wrapper}>
      <CalendarDays size={16} className="shrink-0 text-eventCardBorderColor" />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{sorted.length} Sabha</span>
        {from && to && (
          <span className="text-textLightColor">
            {" "}
            · {from} – {to}
          </span>
        )}
      </span>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-eventCardBorderColor hover:bg-white"
          >
            View all
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="border-b border-borderColor px-3 py-2 text-xs font-medium uppercase tracking-wide text-textLightColor">
            Sabhas in this report
          </div>
          <ul className="max-h-64 divide-y divide-borderColor overflow-y-auto">
            {sorted.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-textColor">{sabhaName(s)}</span>
                <span className="shrink-0 text-xs text-textLightColor">
                  {formatSabhaDate(s.sabha_date) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
