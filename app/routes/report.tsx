import { Download, EllipsisVertical } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  redirect,
  useSearchParams,
  type LoaderFunctionArgs,
  type MetaArgs,
} from "react-router";
import { Virtuoso } from "react-virtuoso";
import EventCard from "~/components/shared-component/EventCard";
import GroupMemberCards from "~/components/shared-component/GroupMemberCards";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import LoadingSpinner from "~/components/shared-component/LoadingSpinner";
import MemberListCard from "~/components/shared-component/MemberListCard";
import ReportSabhaBar from "~/components/shared-component/ReportSabhaBar";
import ConfirmDialog from "~/components/shared-component/ConfirmDialog";
import { toast } from "~/components/shared-component/Toaster";
import WhatsAppBulkSendDialog from "~/components/shared-component/WhatsAppBulkSendDialog";
import WhatsAppIcon from "~/components/shared-component/WhatsAppIcon";
import { DialogClose } from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  POSHAK_GROUP_TYPES,
  type PoshakGroupType,
} from "~/constant/constant";
import { useReport } from "~/hooks/useReport";
import { useSabha } from "~/hooks/useSabha";
import { useMyPermissions } from "~/hooks/usePermissions";
import axiosInstance from "~/interceptor/interceptor";
import { useWhatsAppBulkSend } from "~/hooks/useWhatsAppBulkSend";
import { sabhaService } from "~/services/sabhaService";
import type { filterType } from "~/services/reportService";
import {
  getApiErrorMessage,
  whatsappService,
} from "~/services/whatsappService";
import type { PoshakGroupData } from "~/types/members.interface";
import type { WhatsAppReportSelection } from "~/types/whatsapp.interface";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export function meta({}: MetaArgs) {
  return [
    { title: "Members" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    return redirect("/login");
  }

  return null;
};

// How a duration filter is described in the "send to all" confirmation.
const FILTER_LABELS: Record<filterType, string> = {
  lastSabha: "Latest sabha",
  lastMonthAllSabha: "All sabhas of the last month",
  lastThreeMonthsAllSabha: "All sabhas of the last 3 months",
  lastSixMonthsAllSabha: "All sabhas of the last 6 months",
  lastYearAllSabha: "All sabhas of the last year",
  lastFourSabha: "Last 4 sabhas",
  allSabhaWithDuration: "Sabhas in the selected duration",
};

// "all-members" + one tab per poshak group_type (poshak | sakshi | aatmiy) + completed.
type ReportTabs = "all-members" | PoshakGroupType | "completed-sabha";

const isGroupTypeTab = (t: string): t is PoshakGroupType =>
  POSHAK_GROUP_TYPES.some((gt) => gt.key === t);

export default function Report() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<ReportTabs>("all-members");
  const [selectedFilter, setSelectedFilter] = useState<filterType>("lastSabha");

  // Specific completed-sabha selection. When `appliedSabhaIds` is non-empty it drives
  // the report (and downloads), taking precedence over the duration `selectedFilter`.
  const [completedSabhas, setCompletedSabhas] = useState<
    { id: number; title: string; sabha_date?: string }[]
  >([]);
  const [checkedSabhaIds, setCheckedSabhaIds] = useState<number[]>([]); // in-drawer (pending)
  const [appliedSabhaIds, setAppliedSabhaIds] = useState<number[]>([]); // applied to report
  const [sabhaSearch, setSabhaSearch] = useState("");
  const [dlMenuOpen, setDlMenuOpen] = useState(false);
  // Progress for the "Download Separate" (one file per group) flow.
  const [sepProgress, setSepProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  // Groups whose report image is being sent to WhatsApp right now. The ref
  // blocks a double click before the state update re-renders the button.
  const [sendingGroupIds, setSendingGroupIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const sendingGroupIdsRef = useRef<Set<number>>(new Set());
  // "Send to all Poshak Leaders": confirmation + progress dialogs.
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkProgressOpen, setBulkProgressOpen] = useState(false);

  const {
    loading,
    searchText,
    filteredMembers,
    filteredMembersByPoshakGroups,
    groupReport,
    sabhaCount,
    reportSabhas,
    fetchMembersReport,
    fetchGroupReport,
    setSearchText,
  } = useReport();

  const {
    sabhaList,
    totalSabha,
    loading: sabhaLoading,
    setSabhaList,
    fetchSabhaList,
  } = useSabha();

  // Gate each report sub-tab by its module (permissive until perms load).
  const { can, myLoaded } = useMyPermissions();
  const canAll = !myLoaded || can("all_members", "read");
  const canGroup = !myLoaded || can("poshak_group", "read");
  const canCompleted = !myLoaded || can("completed_sabha", "read");
  // Sending reports from the linked WhatsApp account (POST => "create").
  const canWhatsApp = myLoaded && can("whatsapp", "create");

  const bulk = useWhatsAppBulkSend({ enabled: canWhatsApp });
  const resolveTab = (t: ReportTabs): ReportTabs => {
    if (t === "all-members" && canAll) return t;
    if (isGroupTypeTab(t) && canGroup) return t;
    if (t === "completed-sabha" && canCompleted) return t;
    return canAll ? "all-members" : canGroup ? "poshak" : "completed-sabha";
  };

  // The active group_type when a group tab is selected (else undefined).
  const activeGroupType: PoshakGroupType | undefined = isGroupTypeTab(activeTab)
    ? activeTab
    : undefined;
  const groupTypeParam = activeGroupType ? `&group_type=${activeGroupType}` : "";

  // Helper to update searchParams
  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    setSearchParams(params);
  };

  const handleDownLoadClick = async () => {
    const filterParam = selectedFilter || "lastMonthAllSabha";
    const sabhaIdsParam =
      appliedSabhaIds.length > 0
        ? `&sabha_ids=${appliedSabhaIds.join(",")}`
        : "";
    try {
      let url = "";
      let filename = "";
      if (activeTab === "all-members") {
        // Download all members report
        const response = await axiosInstance.get(
          `report/download/user?filter=${filterParam}${sabhaIdsParam}`,
          { responseType: "blob" },
        );
        url = window.URL.createObjectURL(new Blob([response.data]));
        filename = "user_attendance_report.xlsx";
      } else if (isGroupTypeTab(activeTab)) {
        // Download group report for the active group_type only.
        const response = await axiosInstance.get(
          `report/download/group?filter=${filterParam}${sabhaIdsParam}${groupTypeParam}`,
          { responseType: "blob" },
        );
        url = window.URL.createObjectURL(new Blob([response.data]));
        filename = `group_attendance_report_${activeTab}.xlsx`;
      } else if (activeTab === "completed-sabha") {
        // Download completed sabha report
        // (Implement as needed)
      }
      if (url && filename) {
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      // Optionally show error to user
      throw error;
    }
  };

  // Download each group's report as its own Excel file, one by one, with progress.
  const handleDownloadSeparate = async () => {
    if (sepProgress) return; // already running
    const groups: any[] = groupReport || [];
    if (!groups.length) return;
    const filterParam = selectedFilter || "lastMonthAllSabha";
    const sabhaIdsParam =
      appliedSabhaIds.length > 0
        ? `&sabha_ids=${appliedSabhaIds.join(",")}`
        : "";

    setSepProgress({ current: 0, total: groups.length, label: "" });
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const groupParam = g.group_id == null ? "none" : String(g.group_id);
      const leaderName = g.leader_details
        ? [
            g.leader_details.first_name,
            g.leader_details.middle_name,
            g.leader_details.last_name,
          ]
            .filter(Boolean)
            .join(" ")
        : "Others";
      setSepProgress({ current: i + 1, total: groups.length, label: leaderName });
      try {
        const response = await axiosInstance.get(
          `report/download/group?filter=${filterParam}&group_id=${groupParam}${sabhaIdsParam}${groupTypeParam}`,
          { responseType: "blob" },
        );
        const safeName =
          leaderName
            .replace(/[\\/:*?"<>|]/g, "_")
            .replace(/\s+/g, " ")
            .trim() || `group_${groupParam}`;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `${safeName}.xlsx`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch {
        // Skip groups with no data (the per-group endpoint returns 400 when empty).
      }
      // brief pause so the browser doesn't block rapid successive downloads
      await new Promise((r) => setTimeout(r, 500));
    }
    setSepProgress(null);
  };

  // Download the attendance report for a single poshak group (current filter).
  // groupId is null for the "Others" bucket -> backend expects group_id=none.
  const handleGroupDownload = async (
    groupId: number | null,
    leaderName: string,
  ) => {
    const filterParam = selectedFilter || "lastMonthAllSabha";
    const groupParam = groupId == null ? "none" : String(groupId);
    const fallbackName = groupId == null ? "No Group" : `group_${groupId}`;
    const sabhaIdsParam =
      appliedSabhaIds.length > 0
        ? `&sabha_ids=${appliedSabhaIds.join(",")}`
        : "";
    try {
      const response = await axiosInstance.get(
        `report/download/group?filter=${filterParam}&group_id=${groupParam}${sabhaIdsParam}${groupTypeParam}`,
        { responseType: "blob" },
      );
      // Filename = group leader's full name (sanitized for the filesystem).
      const safeName =
        (leaderName || fallbackName)
          .replace(/[\\/:*?"<>|]/g, "_")
          .replace(/\s+/g, " ")
          .trim() || fallbackName;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${safeName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      throw error;
    }
  };

  // The report screen's current selection, sent with every WhatsApp request so
  // the backend builds exactly this report: the explicit sabha selection when
  // there is one, otherwise the duration filter — scoped to the active tab.
  const whatsAppSelection: WhatsAppReportSelection = useMemo(
    () => ({
      ...(appliedSabhaIds.length > 0
        ? { sabhaIds: appliedSabhaIds }
        : { filter: selectedFilter }),
      ...(activeGroupType ? { groupType: activeGroupType } : {}),
    }),
    [appliedSabhaIds, selectedFilter, activeGroupType],
  );

  // Sabhas listed in the "send to all" confirmation.
  const selectedSabhaLabels = useMemo(() => {
    if (appliedSabhaIds.length === 0) return [FILTER_LABELS[selectedFilter]];
    return completedSabhas
      .filter((s) => appliedSabhaIds.includes(s.id))
      .map((s) => (s.sabha_date ? `${s.title} (${s.sabha_date})` : s.title));
  }, [appliedSabhaIds, completedSabhas, selectedFilter]);

  // Groups that have a Poshak Leader to send to (the "Others" bucket has none).
  const leaderGroupCount = useMemo(
    () => (groupReport || []).filter((g) => g.group_id != null).length,
    [groupReport],
  );

  // Send one group's member list image to its Poshak Leader. The backend
  // renders the image (single / multiple sabha layout) and sends it on WhatsApp.
  const handleSendGroupReport = async (
    group: PoshakGroupData,
    leaderName: string,
  ) => {
    const groupId = group?.group_id;
    if (groupId == null || sendingGroupIdsRef.current.has(groupId)) return;

    sendingGroupIdsRef.current.add(groupId);
    setSendingGroupIds(new Set(sendingGroupIdsRef.current));
    try {
      await whatsappService.sendGroupReport({
        ...whatsAppSelection,
        groupId,
        poshakLeaderId: group.poshak_leader_id ?? undefined,
      });
      toast.success(`✓ Report sent to ${leaderName}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send report"));
    } finally {
      sendingGroupIdsRef.current.delete(groupId);
      setSendingGroupIds(new Set(sendingGroupIdsRef.current));
    }
  };

  // Header WhatsApp button: reopen the progress of a running run, otherwise
  // ask for confirmation first.
  const handleBulkButtonClick = () => {
    if (bulk.isRunning) {
      setBulkProgressOpen(true);
      return;
    }
    setBulkConfirmOpen(true);
  };

  const handleConfirmBulkSend = async () => {
    try {
      await bulk.start(whatsAppSelection);
      setBulkConfirmOpen(false);
      setBulkProgressOpen(true);
    } catch (error: any) {
      setBulkConfirmOpen(false);
      toast.error(error?.message || "Couldn't start sending reports");
    }
  };

  const canBulkSend = sabhaCount > 0 && leaderGroupCount > 0 && !loading;
  const bulkButtonTitle = bulk.isRunning
    ? "Sending reports — tap to see progress"
    : sabhaCount === 0
      ? "Select at least one Sabha before sending reports."
      : "Send reports to all Poshak Leaders";

  // Load the completed-sabha list once (for the multi-select filter in the drawer).
  useEffect(() => {
    (async () => {
      try {
        const res: any = await sabhaService.getSabhas("completed");
        const rows = Array.isArray(res?.data) ? res.data : (res?.data?.rows ?? []);
        setCompletedSabhas(
          rows.map((s: any) => ({
            id: s.id,
            title: s.title,
            sabha_date: s.sabha_date,
          })),
        );
      } catch {
        setCompletedSabhas([]);
      }
    })();
  }, []);

  // Sabha multi-select helpers (search-aware: "Select All" acts on the visible rows)
  const visibleSabhas = completedSabhas.filter((s) => {
    const q = sabhaSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.title || "").toLowerCase().includes(q) ||
      (s.sabha_date || "").toLowerCase().includes(q)
    );
  });
  const allVisibleChecked =
    visibleSabhas.length > 0 &&
    visibleSabhas.every((s) => checkedSabhaIds.includes(s.id));
  const toggleAllVisible = () =>
    setCheckedSabhaIds((prev) => {
      const visibleIds = visibleSabhas.map((s) => s.id);
      return allVisibleChecked
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds]));
    });
  const toggleSabha = (id: number) =>
    setCheckedSabhaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const applySabhaSelection = () => setAppliedSabhaIds(checkedSabhaIds);

  // Sync with URL and call API
  useEffect(() => {
    const urlTab = resolveTab(
      (searchParams.get("tab") as ReportTabs) || "all-members",
    );
    const urlFilter = (searchParams.get("filter") as filterType) || "lastSabha";

    setActiveTab(urlTab);
    setSelectedFilter(urlFilter);
    setSearchText("");
    setSabhaList([]);

    if (urlTab === "all-members") {
      fetchMembersReport(urlFilter, appliedSabhaIds);
    } else if (isGroupTypeTab(urlTab)) {
      // Load only the selected group_type's groups.
      fetchGroupReport(urlFilter, appliedSabhaIds, urlTab);
    } else if (urlTab === "completed-sabha") {
      fetchSabhaList("completed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, appliedSabhaIds, myLoaded]);

  return (
    <LayoutWrapper
      headerConfigs={{
        title: "Report",
        children: (
          <div className="flex justify-center items-center gap-4 pr-3">
            {/* Send the selected report to every Poshak Leader on WhatsApp */}
            {canWhatsApp && isGroupTypeTab(activeTab) && (
              <button
                type="button"
                onClick={handleBulkButtonClick}
                disabled={!bulk.isRunning && (!canBulkSend || bulk.starting)}
                title={bulkButtonTitle}
                aria-label={bulkButtonTitle}
                className="relative disabled:opacity-40"
              >
                <WhatsAppIcon size={22} className="text-white" />
                {bulk.isRunning && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[#25D366]">
                    <Spinner className="size-3 text-white" />
                  </span>
                )}
              </button>
            )}

            {isGroupTypeTab(activeTab) ? (
              <Popover open={dlMenuOpen} onOpenChange={setDlMenuOpen}>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Download options">
                    <Download size={22} className="text-white" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60 p-1 text-textColor">
                  <button
                    type="button"
                    onClick={() => {
                      setDlMenuOpen(false);
                      handleDownLoadClick();
                    }}
                    className="w-full flex flex-col items-start rounded-md px-3 py-2 hover:bg-gray-100 text-left"
                  >
                    <span className="text-sm font-medium">Download One</span>
                    <span className="text-xs text-textLightColor">
                      All groups in a single file
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!!sepProgress}
                    onClick={() => {
                      setDlMenuOpen(false);
                      handleDownloadSeparate();
                    }}
                    className="w-full flex flex-col items-start rounded-md px-3 py-2 hover:bg-gray-100 text-left disabled:opacity-50"
                  >
                    <span className="text-sm font-medium">Download Separate</span>
                    <span className="text-xs text-textLightColor">
                      One Excel file per group
                    </span>
                  </button>
                </PopoverContent>
              </Popover>
            ) : (
              <Download
                size={22}
                className="text-white"
                onClick={handleDownLoadClick}
              />
            )}

            {/* Drawer For Filters */}
            <Drawer>
              <DrawerTrigger>
                <EllipsisVertical size={22} className="text-white" />
              </DrawerTrigger>

              <DrawerContent>
                <DrawerHeader className="text-start">
                  <DrawerTitle>Generate Report</DrawerTitle>
                  <DrawerDescription>
                    Pick specific completed sabhas, or choose a duration below.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="max-h-[70vh] overflow-y-auto pb-4">
                  {/* SELECT SPECIFIC SABHAS (multi-select + select all) */}
                  <div className="px-4 pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-textColor">
                        Select Sabha
                      </span>
                      <label className="flex items-center gap-2 text-sm text-textColor cursor-pointer">
                        <Checkbox
                          checked={allVisibleChecked}
                          onCheckedChange={toggleAllVisible}
                        />
                        Select All
                      </label>
                    </div>

                    {/* Search sabhas */}
                    <input
                      type="text"
                      value={sabhaSearch}
                      onChange={(e) => setSabhaSearch(e.target.value)}
                      placeholder="Search sabha..."
                      className="w-full mb-2 h-10 px-3 rounded-lg border border-borderColor bg-white text-sm text-textColor placeholder:text-textLightColor outline-none focus:border-primaryColor"
                    />

                    <div className="max-h-48 overflow-y-auto rounded-lg border border-borderColor divide-y divide-borderColor">
                      {visibleSabhas.length === 0 ? (
                        <div className="p-3 text-sm text-textLightColor">
                          {completedSabhas.length === 0
                            ? "No completed sabhas"
                            : "No sabha matches your search"}
                        </div>
                      ) : (
                        visibleSabhas.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-3 p-3 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={checkedSabhaIds.includes(s.id)}
                              onCheckedChange={() => toggleSabha(s.id)}
                            />
                            <div className="flex flex-col">
                              <span className="text-textColor">{s.title}</span>
                              {s.sabha_date && (
                                <span className="text-xs text-textLightColor">
                                  {s.sabha_date}
                                </span>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    <DialogClose
                      disabled={checkedSabhaIds.length === 0}
                      onClick={applySabhaSelection}
                      className="w-full mt-3 p-3 rounded-lg bg-primaryColor text-white text-sm font-medium disabled:opacity-50"
                    >
                      Generate Report
                      {checkedSabhaIds.length ? ` (${checkedSabhaIds.length})` : ""}
                    </DialogClose>

                  </div>
                </div>

                {/* <DrawerFooter className="flex-row justify-between items-center px-4 pb-4">
                  <DrawerClose className="w-1/2 pr-2">
                    <Button variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </DrawerClose>

                  <DrawerClose className="w-1/2 pl-2">
                    <Button className="w-full">Submit</Button>
                  </DrawerClose>
                </DrawerFooter> */}
              </DrawerContent>
            </Drawer>
          </div>
        ),
        className: "flex-col gap-2",
        description: `Total ${sabhaCount} Sabha`,
        showSearch: true,
        searchPlaceholder: "Search Members...",
        searchValue: searchText,
        onSearchChange: (value: string) => {
          setSearchText(value);
        },
      }}
    >
      {/* Download Separate progress */}
      {sepProgress && (
        <div className="sticky top-0 z-30 bg-white border-b border-borderColor px-4 py-2">
          <div className="flex justify-between items-center text-sm text-textColor mb-1">
            <span className="truncate">
              Downloading: {sepProgress.label || "…"}
            </span>
            <span className="shrink-0 ml-2">
              {sepProgress.current}/{sepProgress.total}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primaryColor transition-all duration-300"
              style={{
                width: `${(sepProgress.current / sepProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* TABS */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as ReportTabs);
          updateParam("tab", val);
        }}
        className="w-full h-full flex flex-col justify-start"
      >
        {/* Scrollable on mobile: tabs keep their natural width and scroll instead of squishing. */}
        <TabsList className="w-full flex justify-start sm:justify-between items-center bg-primaryColor rounded-none h-10 pb-2 overflow-x-auto scrollbar-none [&>button]:shrink-0">
          {canAll && <TabsTrigger value="all-members">All Members</TabsTrigger>}
          {canGroup &&
            POSHAK_GROUP_TYPES.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          {canCompleted && (
            <TabsTrigger value="completed-sabha">Completed Sabha</TabsTrigger>
          )}
        </TabsList>

        {/* Which sabha(s) the report on screen is for */}
        {activeTab !== "completed-sabha" && (canAll || canGroup) && (
          <ReportSabhaBar sabhas={reportSabhas} loading={loading} />
        )}

        {myLoaded && !canAll && !canGroup && !canCompleted && (
          <div className="mt-10 text-center text-textLightColor">
            You don&apos;t have access to any report view.
          </div>
        )}

        {/* ALL MEMBERS */}
        {canAll && (
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
                    totalSabha={sabhaCount}
                    from={"report"}
                  />
                );
              }}
              components={{
                Footer: () =>
                  filteredMembers.length === 0 && (
                    <div className="text-center mt-2 text-textLightColor">
                      No members found
                    </div>
                  ),
              }}
            />
          )}
        </TabsContent>
        )}

        {/* GROUP TABS — one per group_type, all sharing the same content. */}
        {canGroup &&
          POSHAK_GROUP_TYPES.map((t) => (
            <TabsContent
              key={t.key}
              value={t.key}
              className="h-full w-full overflow-y-auto"
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <GroupMemberCards
                  groupData={filteredMembersByPoshakGroups}
                  from="report"
                  totalSabha={sabhaCount}
                  showDownload={true}
                  onDownloadGroup={handleGroupDownload}
                  onShareGroupImage={
                    canWhatsApp ? handleSendGroupReport : undefined
                  }
                  sendingGroupIds={sendingGroupIds}
                />
              )}
            </TabsContent>
          ))}

        {/* COMPLETED SABHA */}
        {canCompleted && (
        <TabsContent value="completed-sabha" className="p-4 w-full h-full">
          {sabhaLoading ? (
            <LoadingSpinner />
          ) : (
            <Virtuoso
              totalCount={totalSabha}
              data={sabhaList}
              itemContent={(index, sabha) => (
                <div key={sabha?.id} className="w-full mb-4">
                  <EventCard sabha={sabha} />
                </div>
              )}
              components={{
                Footer: () =>
                  sabhaList.length === 0 && <div>No sabha found</div>,
              }}
              className="scrollbar-none"
            />
          )}
        </TabsContent>
        )}
      </Tabs>

      {/* Send to all Poshak Leaders — confirmation */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Send WhatsApp Reports?"
        description={
          <>
            This will send reports to{" "}
            <b>
              {leaderGroupCount} Poshak{" "}
              {leaderGroupCount === 1 ? "Leader" : "Leaders"}
            </b>{" "}
            for the selected Sabhas, one by one:
          </>
        }
        confirmText="Send Reports"
        loadingText="Starting…"
        loading={bulk.starting}
        onConfirm={handleConfirmBulkSend}
      >
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-borderColor px-3 py-2 text-sm text-textColor">
          {selectedSabhaLabels.map((label) => (
            <li key={label} className="py-0.5">
              {label}
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      {/* Send to all Poshak Leaders — live progress */}
      <WhatsAppBulkSendDialog
        open={bulkProgressOpen}
        onOpenChange={setBulkProgressOpen}
        job={bulk.job}
        cancelling={bulk.cancelling}
        onCancel={bulk.cancel}
      />
    </LayoutWrapper>
  );
}
