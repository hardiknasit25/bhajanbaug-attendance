import {
  Check,
  MoreVertical,
  RotateCcw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  redirect,
  useLoaderData,
  useNavigate,
  useNavigationType,
  type LoaderFunction,
  type MetaArgs,
} from "react-router";
import { Virtuoso } from "react-virtuoso";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import LoadingSpinner from "~/components/shared-component/LoadingSpinner";
import MemberListCard from "~/components/shared-component/MemberListCard";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useMembers } from "~/hooks/useMembers";
import { useSabha } from "~/hooks/useSabha";
import { usePermission } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";
import {
  clearPendingAttendance,
  hasPendingAttendance,
} from "~/utils/pendingAttendance";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";
export function meta({}: MetaArgs) {
  return [
    { title: "Members" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    return redirect("/login");
  }

  return {
    sabhaId: params.sabhaid,
  };
};

type DialogButton = {
  label: string;
  variant?: "default" | "outline";
  action: () => void | Promise<void>;
};

type DialogState = {
  open: boolean;
  title: string;
  message: string;
  buttons: DialogButton[];
};

export default function EventAttendance() {
  const { sabhaId } = useLoaderData() as { sabhaId: string };
  const navigate = useNavigate();
  const navType = useNavigationType();
  const {
    loading,
    selectedSabha,
    sabhaMembers,
    filteredSabhaMembers,
    searchText,
    totalPresentOnSelectedSabha,
    totalAbsentOnSelectedSabha,
    totalMembersOnSelectedSabha,
    fetchSabhaById,
    setSabhaMemberSearchText,
    submitSabhaReport,
    syncSabhaAttendance,
  } = useSabha();
  const { groupSelect, fetchGroupSelect } = useMembers();
  const { canUpdate: canUpdateSabha } = usePermission("sabha");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");

  // Filter the group list by leader / group name for the group-wise menu.
  const normalizedGroupSearch = groupSearch.trim().toLowerCase();
  const filteredGroups = normalizedGroupSearch
    ? groupSelect.filter(
        (g) =>
          g.leader_name?.toLowerCase().includes(normalizedGroupSearch) ||
          g.group_name?.toLowerCase().includes(normalizedGroupSearch),
      )
    : groupSelect;

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    title: "",
    message: "",
    buttons: [],
  });

  // Tapping an active counter clears the filter; tapping the other one switches to it.
  // Pending marks are synced first so the counts match the list.
  const toggleUserFilter = async (key: "present" | "absent") => {
    await syncAttendance();
    const newFilter = userFilter === key ? undefined : key;
    setUserFilter(newFilter);
    fetchSabhaById(Number(sabhaId), newFilter, selectedGroupId);
  };

  const fetchSabhaMembers = () => {
    fetchSabhaById(Number(sabhaId), userFilter, selectedGroupId);
  };

  // Apply the "group wise" filter — null means all members.
  const handleSelectGroup = (groupId: number | null) => {
    setSelectedGroupId(groupId);
    setGroupMenuOpen(false);
    fetchSabhaById(Number(sabhaId), userFilter, groupId);
  };

  const checkPendingChanges = () => {
    const pending = hasPendingAttendance();
    setHasPendingChanges(pending);
    return pending;
  };

  const openDialog = (
    title: string,
    message: string,
    buttons: DialogButton[],
  ) => {
    setDialog({ open: true, title, message, buttons });
  };

  const handleRefreshSabha = async () => {
    const response = await syncSabhaAttendance(Number(sabhaId)).unwrap();

    if (!response) {
      return;
    }

    clearPendingAttendance();

    fetchSabhaById(Number(sabhaId), userFilter, selectedGroupId);

    openDialog(
      "Synced Successfully!",
      "Your attendance data has been synced successfully.",
      [
        {
          label: "OK",
          action: () => setDialog((d) => ({ ...d, open: false })),
        },
      ],
    );
  };

  const handleSubmitSabha = async () => {
    const hasPending = await checkPendingChanges();

    if (hasPending) {
      openDialog(
        "Unsaved Changes?",
        "You have unsaved changes. Please sync them before submitting.",
        [
          {
            label: "Sync Now",
            action: async () => {
              setDialog((d) => ({ ...d, open: false }));

              handleRefreshSabha();
            },
          },
        ],
      );
    } else {
      openDialog(
        "Submit Attendance?",
        "Are you sure you want to submit? You can't edit after submission.",
        [
          {
            label: "Cancel",
            variant: "outline",
            action: () => setDialog((d) => ({ ...d, open: false })),
          },
          {
            label: "Yes, Submit",
            action: async () => {
              setDialog((d) => ({ ...d, open: false }));

              const res = await submitSabhaReport(Number(sabhaId));

              if (res) {
                openDialog(
                  "Submitted Successfully!",
                  "Attendance submission completed successfully.",
                  [
                    {
                      label: "OK",
                      action: () => setDialog((d) => ({ ...d, open: false })),
                    },
                  ],
                );
              }
            },
          },
        ],
      );
    }
  };

  useEffect(() => {
    fetchSabhaMembers();
  }, [sabhaId]);

  // Load the poshak groups for the "group wise" filter menu.
  useEffect(() => {
    fetchGroupSelect();
  }, []);

  // useEffect(() => {
  //   if (!hasPendingChanges) {
  //     return;
  //   }

  //   openDialog(
  //     "Unsynced Changes",
  //     "You have unsynced attendance changes. Please sync before leaving. else, your changes may be lost.",
  //     [
  //       {
  //         label: "Cancel",
  //         variant: "outline",
  //         action: () => {
  //           setDialog((d) => ({ ...d, open: false }));
  //           navigate(-1);
  //         },
  //       },
  //       {
  //         label: "Sync & Leave",
  //         action: async () => {
  //           setDialog((d) => ({ ...d, open: false }));

  //           const res = await syncSabhaAttendance(Number(sabhaId));

  //           if (res) {
  //             localJsonStorageService.setItem(PRESENT_MEMBER, []);
  //             localJsonStorageService.setItem(ABSENT_MEMBER, []);
  //             navigate(-1);
  //           }
  //         },
  //       },
  //     ]
  //   );
  // }, [hasPendingChanges]);

  const openUnsyncedDialog = () => {
    openDialog(
      "Unsynced Changes",
      "You have unsynced attendance changes. Please sync before leaving.",
      [
        {
          label: "Cancel",
          variant: "outline",
          action: () => {
            setDialog((d) => ({ ...d, open: false }));
          },
        },
        {
          label: "Sync & Leave",
          action: async () => {
            setDialog((d) => ({ ...d, open: false }));

            const res = await syncSabhaAttendance(Number(sabhaId));
            if (res) {
              clearPendingAttendance();

              navigate("/sabha"); // Now allow back navigation
            }
          },
        },
      ],
    );
  };

  // useEffect(() => {
  //   window.history.pushState(null, "", window.location.href);

  //   const handleBack = () => {
  //     console.log("Back pressed - intercepted");
  //     const hasPendingChanges = checkPendingChanges();
  //     if (!hasPendingChanges) {
  //       navigate("/sabha");
  //     } else {
  //       openUnsyncedDialog();
  //     }
  //     window.history.pushState(null, "", window.location.href);
  //   };

  //   window.addEventListener("popstate", handleBack);

  //   return () => window.removeEventListener("popstate", handleBack);
  // }, []);

  const syncAttendance = async () => {
    try {
      const res = await syncSabhaAttendance(Number(sabhaId));
      if (res) {
        clearPendingAttendance();
      }
    } catch (error) {
      console.error("Sync failed during unmount:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (hasPendingAttendance()) {
        (async () => {
          await syncAttendance();
          navigate("/sabha");
        })();
      }
    };
  }, []);

  return (
    <LayoutWrapper
      showTab={false}
      headerConfigs={{
        title: "Attendance",
        iconName: "ArrowLeft",
        children: (
          <div className="flex justify-end items-center gap-4 pr-3">
            <div
              className="relative cursor-pointer"
              onClick={handleRefreshSabha}
            >
              <RotateCcw size={22} />

              {/* O(1) in-memory read — this used to JSON.parse both queues on
                  every render of the screen. */}
              {hasPendingAttendance() && (
                <span className="absolute -top-0 right-0 w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </div>

            {selectedSabha?.status === "running" && canUpdateSabha && (
              <Send
                size={22}
                onClick={handleSubmitSabha}
                className="cursor-pointer"
              />
            )}

            {/* Group-wise filter */}
            <Popover
              open={groupMenuOpen}
              onOpenChange={(open) => {
                setGroupMenuOpen(open);
                if (!open) setGroupSearch("");
              }}
            >
              <PopoverTrigger asChild>
                <div className="relative cursor-pointer">
                  <MoreVertical size={22} />
                  {selectedGroupId !== null && (
                    <span className="absolute -top-0 right-0 h-2 w-2 rounded-full bg-selectionColor"></span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-0">
                <div className="border-b border-borderColor px-3 py-2 text-xs font-semibold uppercase tracking-wider text-textLightColor">
                  Group wise
                </div>

                {/* Search */}
                <div className="border-b border-borderColor p-2">
                  <div className="flex items-center gap-2 rounded-md border border-borderColor px-2">
                    <Search size={16} className="text-textLightColor" />
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Search group..."
                      className="h-8 w-full bg-transparent text-sm text-textColor outline-none placeholder:text-textLightColor"
                    />
                    {groupSearch && (
                      <X
                        size={14}
                        onClick={() => setGroupSearch("")}
                        className="cursor-pointer text-textLightColor"
                      />
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="max-h-64 overflow-y-auto">
                  {!normalizedGroupSearch && (
                    <button
                      type="button"
                      onClick={() => handleSelectGroup(null)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-textColor hover:bg-gray-100"
                    >
                      <span>All Members</span>
                      {selectedGroupId === null && (
                        <Check size={16} className="text-selectionColor" />
                      )}
                    </button>
                  )}

                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleSelectGroup(group.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-textColor hover:bg-gray-100"
                    >
                      <span className="flex flex-col">
                        <span className="capitalize">
                          {group.leader_name || group.group_name}
                        </span>
                        {group.group_name && group.leader_name && (
                          <span className="text-xs text-textLightColor">
                            {group.group_name}
                          </span>
                        )}
                      </span>
                      {selectedGroupId === group.id && (
                        <Check
                          size={16}
                          className="shrink-0 text-selectionColor"
                        />
                      )}
                    </button>
                  ))}

                  {filteredGroups.length === 0 && (
                    <div className="px-3 py-3 text-center text-xs text-textLightColor">
                      No groups found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ),
        className: "flex-col gap-2",
        description: `Total ${filteredSabhaMembers.length} Members`,
        showSearch: true,
        searchPlaceholder: "Search Members...",
        searchValue: searchText,
        onSearchChange: setSabhaMemberSearchText,
      }}
    >
      {/* Single scroll area: header summary stays fixed, only the list scrolls. */}
      <div className="flex h-full flex-col">
        {/* Summary Counts — each doubles as a filter toggle; the active one is
            highlighted and a banner below says which filter is applied. */}
        <div className="flex shrink-0 justify-around items-center gap-3 p-2 shadow-sm">
          {(
            [
              { key: "present", label: "Present", color: "green", count: totalPresentOnSelectedSabha },
              {
                key: "absent",
                label: "Absent",
                color: "red",
                count:
                  selectedSabha?.status !== "completed"
                    ? totalAbsentOnSelectedSabha
                    : totalMembersOnSelectedSabha - totalPresentOnSelectedSabha,
              },
            ] as const
          ).map(({ key, label, color, count }) => {
            const active = userFilter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleUserFilter(key)}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-xl border-2 py-1 transition-colors",
                  active
                    ? color === "green"
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <span
                  className={cn(
                    "text-3xl font-medium font-poppins",
                    color === "green" ? "text-green-500" : "text-red-500",
                  )}
                >
                  {count}
                </span>
                <span className="text-base text-textColor font-medium font-poppins">{label}</span>
              </button>
            );
          })}
        </div>

        {userFilter && (
          <div className="flex shrink-0 items-center justify-between bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
            <span>
              Filter applied: <b className="capitalize">{userFilter}</b> only
            </span>
            <button type="button" onClick={() => toggleUserFilter(userFilter as "present" | "absent")} className="font-medium underline">
              Clear
            </button>
          </div>
        )}

        {/* Members List (the only scroll container) */}
        <div className="min-h-0 flex-1">
          {loading && sabhaMembers.length === 0 ? (
            <LoadingSpinner />
          ) : (
            <Virtuoso
              className="h-full"
              totalCount={filteredSabhaMembers.length}
              itemContent={(index) => {
                const member = filteredSabhaMembers[index];
                return (
                  <MemberListCard
                    key={member.id}
                    member={member}
                    from="attendance"
                    selectedSabha={selectedSabha}
                  />
                );
              }}
              components={{
                Footer: () =>
                  sabhaMembers.length === 0 ? (
                    <div className="text-center text-textLightColor mt-2">
                      No members found
                    </div>
                  ) : null,
              }}
            />
          )}
        </div>
      </div>

      {/* Universal Dialog */}
      <Dialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}
      >
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="text-textColor font-semibold">
              {dialog.title}
            </DialogTitle>
          </DialogHeader>

          <p className="text-base text-textLightColor">{dialog.message}</p>

          <DialogFooter className="mt-4 flex gap-2">
            {dialog.buttons.map((btn, index) => (
              <Button
                key={index}
                variant={btn.variant || "default"}
                className="flex-1"
                onClick={btn.action}
              >
                {btn.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </LayoutWrapper>
  );
}
