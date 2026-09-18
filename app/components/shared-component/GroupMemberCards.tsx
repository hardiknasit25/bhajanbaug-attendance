import { ChevronDown, Download, MoreVertical, Share2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import CircularProgress from "./CircularProgress";
import MemberListCard from "./MemberListCard";
import WhatsAppIcon from "./WhatsAppIcon";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "~/lib/utils";
import type { PoshakGroupData } from "~/types/members.interface";

type GroupAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
};

/**
 * The group's actions, collapsed behind a single kebab button so the card header
 * stays readable. Each action closes the menu after firing.
 */
function GroupActionsMenu({
  leaderName,
  actions,
}: {
  leaderName: string;
  actions: GroupAction[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${leaderName}`}
          className="shrink-0 rounded-full p-1 text-textColor/70 hover:bg-gray-300/60"
        >
          <MoreVertical size={18} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => {
              setOpen(false);
              action.onSelect();
            }}
            className="w-full flex items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-textColor hover:bg-gray-100"
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Card layout for poshak groups — the non-accordion alternative to
 * GroupAccordionMember. Each group is its own bordered card that collapses to a
 * summary header and expands in place; several can stay open at once. Cards pack
 * into columns on wider screens (CSS multi-column, so a tall group doesn't leave
 * a hole beside a short one).
 */
function GroupMemberCards({
  groupData,
  from,
  totalSabha,
  showDownload,
  onDownloadGroup,
  onShareGroup,
  onShareGroupImage,
}: {
  groupData: PoshakGroupData[];
  from: "report" | "members";
  totalSabha?: number;
  showDownload?: boolean;
  onDownloadGroup?: (groupId: number | null, leaderName: string) => void;
  // When provided (report tab), adds a "Share report to WhatsApp" action that
  // hands the group's Excel to the device share sheet.
  onShareGroup?: (groupId: number | null, leaderName: string) => void;
  // When provided, adds an action that downloads the group's member list as a
  // themed PNG image (to then attach in WhatsApp).
  onShareGroupImage?: (group: any, leaderName: string) => void;
}) {
  // Open cards, keyed by group id — so open-state stays attached to the right
  // group when the list is filtered, and survives re-renders.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupKey: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (!next.delete(groupKey)) next.add(groupKey);
      return next;
    });

  return (
    <div className="h-full w-full overflow-auto p-3">
      <div className="gap-3 columns-1 md:columns-2 xl:columns-3 [column-fill:_balance]">
        {groupData.map((group) => {
          const poshakLeaderName = group?.leader_details
            ? `${group.leader_details.first_name} ${group.leader_details.middle_name} ${group.leader_details.last_name}`?.trim()
            : "Others";
          // Group name shown under the leader name (hidden for the no-group bucket).
          const groupName =
            group?.group_name && group.group_name !== "Not in any group"
              ? group.group_name
              : null;
          const groupAllMembersPresentCount = group?.users?.reduce(
            (acc, member) => acc + (member.total_present || 0),
            0,
          );

          const groupTotalPercentage =
            groupAllMembersPresentCount && totalSabha
              ? Math.round(
                  (groupAllMembersPresentCount /
                    (group.users.length * totalSabha)) *
                    100,
                )
              : 0;
          // Stable key based on the group's id (not the array index).
          const groupKey =
            group.group_id != null ? `group-${group.group_id}` : "group-others";
          const isOpen = openGroups.has(groupKey);
          // group_id is null for the "Others" (no-group) bucket.
          const groupId = group.group_id ?? null;

          const actions: GroupAction[] = [];
          if (from === "report") {
            if (onShareGroupImage)
              actions.push({
                key: "share-image",
                label: "Share member list image",
                icon: (
                  <WhatsAppIcon
                    size={18}
                    className="text-[#25D366]"
                    aria-hidden="true"
                  />
                ),
                onSelect: () => onShareGroupImage(group, poshakLeaderName),
              });
            if (onShareGroup)
              actions.push({
                key: "share-report",
                label: "Share report to WhatsApp",
                icon: (
                  <Share2 size={18} className="text-green-600" aria-hidden="true" />
                ),
                onSelect: () => onShareGroup(groupId, poshakLeaderName),
              });
            if (showDownload)
              actions.push({
                key: "download",
                label: "Download report",
                icon: (
                  <Download
                    size={18}
                    className="text-blueTextColor"
                    aria-hidden="true"
                  />
                ),
                onSelect: () => onDownloadGroup?.(groupId, poshakLeaderName),
              });
          }

          return (
            <section
              key={groupKey}
              className="mb-3 break-inside-avoid rounded-lg border border-borderColor bg-white overflow-hidden"
            >
              {/* Header: the name + ring area toggles the card; the kebab and
                  chevron sit outside that button (a button can't nest one). */}
              <header className="flex justify-between items-center gap-2 px-4 py-2 border-b border-borderColor bg-gray-200">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${groupKey}-members`}
                  onClick={() => toggleGroup(groupKey)}
                  className="flex-1 min-w-0 flex justify-between items-center gap-3 text-left"
                >
                  {/* No `items-start` here: it would size each span to its own
                      content, so a long leader name would overflow the column
                      and run under the progress ring. The names wrap instead of
                      truncating, so a full name is never cut off. */}
                  <div className="flex-1 min-w-0 flex flex-col justify-start">
                    <span className="block break-words text-sm font-semibold text-textColor">
                      {poshakLeaderName}
                    </span>
                    {groupName && (
                      <span className="block break-words text-xs font-medium capitalize text-textColor/80">
                        {groupName}
                      </span>
                    )}
                    <span className="block text-xs text-textLightColor">
                      Total {group?.users?.length} Members
                    </span>
                  </div>

                  {from === "report" && (
                    <CircularProgress
                      size={45}
                      strokeWidth={2}
                      value={groupTotalPercentage}
                    />
                  )}
                </button>

                <div className="shrink-0 flex items-center gap-1">
                  {actions.length > 0 && (
                    <GroupActionsMenu
                      leaderName={poshakLeaderName}
                      actions={actions}
                    />
                  )}

                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`${groupKey}-members`}
                    aria-label={
                      isOpen
                        ? `Hide members of ${poshakLeaderName}`
                        : `Show members of ${poshakLeaderName}`
                    }
                    onClick={() => toggleGroup(groupKey)}
                    className="rounded-full p-1 hover:bg-gray-300/60"
                  >
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={cn(
                        "text-textColor/70 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                </div>
              </header>

              {isOpen && (
                <div id={`${groupKey}-members`} className="bg-white">
                  {group?.users?.map((member) => (
                    <MemberListCard
                      key={member.id}
                      member={member}
                      from={from}
                      totalSabha={totalSabha}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default GroupMemberCards;
