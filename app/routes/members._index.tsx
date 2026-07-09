import { useEffect, useState } from "react";
import {
  type LoaderFunctionArgs,
  type MetaArgs,
  redirect,
  useSearchParams,
} from "react-router";
import { Virtuoso } from "react-virtuoso";
import MemberBulkActions from "~/components/shared-component/MemberBulkActions";
import GroupAccordionMember from "~/components/shared-component/GroupAccordionMember";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import LoadingSpinner from "~/components/shared-component/LoadingSpinner";
import MemberListCard from "~/components/shared-component/MemberListCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  POSHAK_GROUP_TYPES,
  type PoshakGroupType,
} from "~/constant/constant";
import { useMembers } from "~/hooks/useMembers";
import { useMyPermissions } from "~/hooks/usePermissions";
import { downloadBlob, safeFileName } from "~/utils/downloadBlob";
import { memberQrCardBlob } from "~/utils/memberQrCard";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export function meta({}: MetaArgs) {
  return [
    { title: "Members" },
    { name: "description", content: "Members page" },
  ];
}

// "all-members" plus one tab per poshak group_type (poshak | sakshi | aatmiy).
type MemberTabs = "all-members" | PoshakGroupType;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    return redirect("/login");
  }

  return null;
};

export default function Members() {
  const {
    filteredMembers,
    filteredMembersByPoshakGroups,
    loading,
    searchText,
    fetchMembers,
    setSearchText,
    fetchMembersByPoshakGroups,
  } = useMembers();

  // --------------------------
  // PERMISSIONS (gate each sub-tab by its module)
  // --------------------------
  const { can, myLoaded } = useMyPermissions();
  const canAllMembers = !myLoaded || can("all_members", "read");
  const canByGroup = !myLoaded || can("poshak_group", "read");

  // --------------------------
  // SEARCH PARAMS
  // --------------------------
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = (searchParams.get("tab") as MemberTabs) || "all-members";
  const isGroupTab = POSHAK_GROUP_TYPES.some((t) => t.key === requestedTab);
  // Fall back to a tab the user can access. Group-type tabs are all gated by the
  // single "poshak_group" permission; "poshak" is the default group tab.
  const activeTab: MemberTabs =
    isGroupTab && canByGroup
      ? (requestedTab as PoshakGroupType)
      : canAllMembers
        ? "all-members"
        : canByGroup
          ? "poshak"
          : "all-members";

  // Progress for the per-group "separate QR codes" download (one PDF per member).
  const [qrProgress, setQrProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);

  // --------------------------
  // FETCH MEMBERS BASED ON TAB
  // --------------------------
  useEffect(() => {
    setSearchText("");
    if (activeTab === "all-members") {
      fetchMembers().unwrap();
    } else {
      // activeTab is the group_type — load only that type's groups.
      fetchMembersByPoshakGroups(activeTab);
    }
  }, [activeTab]);

  // Reload the currently-active tab's data (used after a bulk Excel import).
  const refreshMembers = () => {
    if (activeTab === "all-members") {
      fetchMembers();
    } else {
      fetchMembersByPoshakGroups(activeTab);
    }
  };

  // --------------------------
  // HANDLE SEARCH CHANGE
  // --------------------------
  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  // Download a SEPARATE QR card image (PNG) for each member of a poshak group
  // (one file per member). groupId is null for the "Others" bucket.
  const handleGroupQrDownload = async (
    groupId: number | null,
    leaderName: string,
  ) => {
    if (qrProgress) return; // a download run is already in progress
    const group = filteredMembersByPoshakGroups.find(
      (g) => (g.group_id ?? null) === groupId,
    );
    const users = group?.users ?? [];
    if (users.length === 0) return;

    setQrProgress({ current: 0, total: users.length, label: leaderName });
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const memberName = `${u.first_name ?? ""} ${u.middle_name ?? ""} ${
        u.last_name ?? ""
      }`
        .replace(/\s+/g, " ")
        .trim();
      setQrProgress({
        current: i + 1,
        total: users.length,
        label: memberName || `Member #${u.id}`,
      });
      try {
        const blob = await memberQrCardBlob({
          memberId: u.id,
          name: memberName,
          smk: u.smk_no,
          mobile: u.mobile,
        });
        downloadBlob(blob, `qr_${safeFileName(memberName, `member_${u.id}`)}.png`);
      } catch (error) {
        console.error(`Failed to download QR for member ${u.id}`, error);
      }
      // Small gap so the browser doesn't block rapid successive downloads.
      await new Promise((r) => setTimeout(r, 400));
    }
    setQrProgress(null);
  };

  // Member count shown in the header: all-members count, or the sum across the
  // currently-loaded group_type's groups.
  const groupMembersCount = filteredMembersByPoshakGroups.reduce(
    (sum, g) => sum + (g.users?.length ?? 0),
    0,
  );
  const totalCount =
    activeTab === "all-members" ? filteredMembers.length : groupMembersCount;

  // Shared content for every group_type tab — only the active tab is mounted, and
  // state already holds that tab's data (fetched on tab change).
  const groupTabContent = (
    <>
      {/* Separate-QR download progress */}
      {qrProgress && (
        <div className="border-b border-borderColor bg-white px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-sm text-textColor">
            <span className="truncate">
              Downloading QR: {qrProgress.label || "…"}
            </span>
            <span className="ml-2 shrink-0">
              {qrProgress.current}/{qrProgress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primaryColor transition-all duration-300"
              style={{
                width: `${(qrProgress.current / qrProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filteredMembersByPoshakGroups.length === 0 ? (
        <div className="text-center mt-2 text-textLightColor">
          No members found
        </div>
      ) : (
        <GroupAccordionMember
          groupData={filteredMembersByPoshakGroups}
          from="members"
          showDownload={true}
          onDownloadGroup={handleGroupQrDownload}
        />
      )}
    </>
  );

  return (
    <LayoutWrapper
      headerConfigs={{
        title: "Members",
        children: <MemberBulkActions onImported={refreshMembers} />,
        className: "flex-col gap-2",
        description: `Total ${totalCount} Members`,
        showSearch: true,
        searchPlaceholder: "Search Members...",
        searchValue: searchText,
        onSearchChange: handleSearchChange,
        showSorting: activeTab === "all-members",
      }}
    >
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full h-full flex flex-col justify-start"
      >
        <TabsList className="w-full bg-primaryColor rounded-none justify-evenly h-10 pb-2">
          {canAllMembers && (
            <TabsTrigger value="all-members">All Members</TabsTrigger>
          )}
          {canByGroup &&
            POSHAK_GROUP_TYPES.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
        </TabsList>

        {myLoaded && !canAllMembers && !canByGroup && (
          <div className="mt-10 text-center text-textLightColor">
            You don&apos;t have access to any members view.
          </div>
        )}

        {/* All Members */}
        {canAllMembers && (
        <TabsContent value="all-members" className="h-full w-full">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <Virtuoso
              totalCount={filteredMembers.length}
              itemContent={(index) => {
                const member = filteredMembers[index];
                return (
                  <MemberListCard
                    key={member.id}
                    member={member}
                    from="members"
                  />
                );
              }}
              components={{
                Footer: () => {
                  return (
                    filteredMembers.length === 0 && (
                      <div className="text-center mt-2 text-textLightColor">
                        No members found
                      </div>
                    )
                  );
                },
              }}
            />
          )}
        </TabsContent>
        )}

        {/* Poshak group tabs — one per group_type, all sharing the same content. */}
        {canByGroup &&
          POSHAK_GROUP_TYPES.map((t) => (
            <TabsContent
              key={t.key}
              value={t.key}
              className="h-full w-full overflow-hidden"
            >
              {groupTabContent}
            </TabsContent>
          ))}
      </Tabs>
    </LayoutWrapper>
  );
}
