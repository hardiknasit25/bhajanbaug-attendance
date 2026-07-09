import { useMembers } from "~/hooks/useMembers";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import CircularProgress from "./CircularProgress";
import MemberListCard from "./MemberListCard";
import { Download, QrCode } from "lucide-react";
import { cn } from "~/lib/utils";
import type { PoshakGroupData } from "~/types/members.interface";

function GroupAccordionMember({
  groupData,
  from,
  totalSabha,
  showDownload,
  onDownloadGroup,
}: {
  groupData: PoshakGroupData[];
  from: "report" | "members";
  totalSabha?: number;
  showDownload?: boolean;
  onDownloadGroup?: (groupId: number | null, leaderName: string) => void;
}) {
  return (
    <div className="h-full w-full overflow-auto">
      {groupData.map((group, index) => {
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
        // Stable key based on the group's id (not the array index), so accordion
        // open-state stays attached to the right group when the list is filtered.
        const groupKey =
          group.group_id != null ? `group-${group.group_id}` : "group-others";
        return (
          <Accordion type="multiple" key={groupKey}>
            <AccordionItem value={groupKey}>
              <AccordionTrigger
                className={cn(
                  "sticky top-0 z-10 w-full flex justify-center items-center py-2 rounded-none px-4 border-b border-t border-borderColor bg-gray-200",
                )}
              >
                <div className="w-full flex justify-between items-center">
                  <div className="w-full flex flex-col justify-start items-start">
                    <span className="text-sm font-semibold text-textColor">
                      {poshakLeaderName}
                    </span>
                    {groupName && (
                      <span className="text-xs font-medium capitalize text-textColor/80">
                        {groupName}
                      </span>
                    )}
                    <span className="text-xs text-textLightColor">
                      Total {group?.users?.length} Members
                    </span>
                  </div>

                  {from === "report" && (
                    <div className="flex justify-center items-center gap-3">
                      <CircularProgress
                        size={45}
                        strokeWidth={2}
                        value={groupTotalPercentage}
                      />
                      {showDownload && (
                        <Download
                          size={20}
                          role="button"
                          aria-label="Download group report"
                          className="text-blueTextColor cursor-pointer"
                          onClick={(e) => {
                            // Don't toggle the accordion when downloading.
                            e.stopPropagation();
                            e.preventDefault();
                            // group_id is null for the "Others" (no-group) bucket.
                            onDownloadGroup?.(
                              group.group_id ?? null,
                              poshakLeaderName,
                            );
                          }}
                        />
                      )}
                    </div>
                  )}

                  {from === "members" && showDownload && (
                    <QrCode
                      size={20}
                      role="button"
                      aria-label="Download group QR codes"
                      className="text-blueTextColor cursor-pointer"
                      onClick={(e) => {
                        // Don't toggle the accordion when downloading.
                        e.stopPropagation();
                        e.preventDefault();
                        // group_id is null for the "Others" (no-group) bucket.
                        onDownloadGroup?.(group.group_id ?? null, poshakLeaderName);
                      }}
                    />
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="p-0 bg-white">
                {group?.users?.map((member) => (
                  <MemberListCard
                    key={member.id}
                    member={member}
                    from={from}
                    totalSabha={totalSabha}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}
    </div>
  );
}

export default GroupAccordionMember;
