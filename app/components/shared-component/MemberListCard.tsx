import { ChartColumn, Check, X } from "lucide-react";
import { memo, useRef } from "react";
import type { MemberData } from "~/types/members.interface";
import ImageComponent from "./ImageComponent";
import { useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { Separator } from "../ui/separator";
import { useAppDispatch } from "~/store/hooks";
import { doMemberPresent, doMemberAbsent } from "~/store/slice/sabhaSlice";
import type { SabhaData } from "~/types/sabha.interface";

function MemberListCard({
  member,
  from,
  selectedSabha,
  totalSabha,
}: {
  member: MemberData;
  from: "attendance" | "members" | "report";
  selectedSabha?: SabhaData | null;
  totalSabha?: number;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePresentClick = (id: number) => {
    // Dispatch directly so each card does NOT subscribe to the whole sabha slice.
    dispatch(doMemberPresent(id));
  };

  const handleAbsentClick = (id: number) => {
    dispatch(doMemberAbsent(id));
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative flex justify-center gap-2 p-2 pl-4 transition-all",
        from === "members" ? "items-center" : "items-start",
      )}
      onClick={(e) => {
        // The QR preview dialog is portaled to <body>, but its clicks still
        // bubble through the React tree to this handler. Ignore any click whose
        // target isn't actually inside this card (close / download / overlay),
        // otherwise closing the dialog would navigate to the details page.
        if (!cardRef.current?.contains(e.target as Node)) return;
        if (from === "attendance") return;
        else if (from === "report") navigate(`/members/report/${member.id}`);
        else navigate(`/members/details/${member.id}`);
      }}
    >
      {/* Avatar Section */}
      <div className="shrink-0 flex justify-center items-center">
        <ImageComponent src={member.img} alt={member.first_name} />
      </div>

      {/* Content Section */}
      <div
        className={cn("flex flex-1 flex-col justify-between items-start gap-1")}
      >
        {/* Name */}
        <h3 className="text-sm font-semibold text-textColor capitalize">{`${member.first_name} ${member.middle_name} ${member.last_name}`}</h3>

        {/* ID Section */}
        <p className="text-xs font-medium text-gray-400">
          SMK ID:{" "}
          <span className="text-gray-600 font-semibold">
            {member.smk_no !== null && member.smk_no !== "NA"
              ? member.smk_no
              : "No SMK"}
          </span>
        </p>

        {/* Status Icons Row */}
        {from === "attendance" && (
          <div className="w-full flex justify-start items-center gap-12 mt-0.5 pl-4">
            {/* 1. Present / Green Check */}
            <button
              onClick={() => {
                if (member?.is_present) return;
                handlePresentClick(member?.id);
              }}
              className={cn(
                "flex items-center justify-center rounded-full transition-transform p-1",
                member.is_present && "bg-greenTextColor",
              )}
              aria-label="Mark Present"
            >
              <Check
                size={24}
                className={cn(
                  "text-greenTextColor",
                  member?.is_present && "text-white",
                )}
              />
              <span className="sr-only">Present</span>
            </button>

            {/* 2. Absent / Red Cross */}
            <button
              onClick={() => {
                if (member?.is_present === false) return;
                handleAbsentClick(member?.id);
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-transform",
                (member?.is_present === false ||
                  (selectedSabha?.status === "completed" &&
                    !member?.is_present)) &&
                  "bg-red-500",
              )}
              aria-label="Mark Absent"
            >
              <X
                size={24}
                className={cn(
                  "text-redTextColor",
                  (member?.is_present === false ||
                    (selectedSabha?.status === "completed" &&
                      !member?.is_present)) &&
                    "text-white",
                )}
              />
            </button>
          </div>
        )}

        {from === "report" && (
          <div className="w-full flex justify-start items-center mt-1">
            <div className="flex justify-start items-center gap-2 border-r border-r-borderColor pr-4">
              <p className="bg-green-200 size-5 flex justify-center items-center text-xs rounded-full text-greenTextColor">
                P
              </p>
              <span className="text-green-700">
                {member.total_present}/{totalSabha}
              </span>
            </div>
            <div className="flex justify-start items-center gap-2 border-r border-r-borderColor px-4">
              <p className="bg-red-200 size-5 flex justify-center items-center text-xs rounded-full text-redTextColor">
                A
              </p>
              <span className="text-red-700">
                {member.total_absent}/{totalSabha}
              </span>
            </div>
            <div className="flex justify-start items-center gap-2 px-4">
              <ChartColumn size={16} className="text-blueTextColor" />
              <span className="text-blue-700">
                {totalSabha
                  ? Math.round((member.total_present / totalSabha) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Per-member QR preview + download - hidden from the UI (kept for future use).
      {from === "members" && (
        <MemberQrDialog
          memberId={member.id}
          memberName={memberName}
          smkNo={member.smk_no}
          mobile={member.mobile}
          iconSize={20}
          className="shrink-0 self-center rounded-full p-2 text-primaryColor hover:bg-gray-100"
        />
      )}
      */}
      <Separator
        orientation="vertical"
        className="absolute bg-borderColor/30 w-[95%] h-[1px] bottom-0 left-1/2 right-1/2 translate-x-[-50%]"
      />
    </div>
  );
}

// Memoised: the attendance list is long, and marking one member present changes
// only that member's object (immer keeps the rest referentially equal), so every
// other row can skip re-rendering entirely.
export default memo(MemberListCard);
