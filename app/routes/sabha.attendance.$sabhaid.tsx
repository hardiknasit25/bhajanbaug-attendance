import {
  Check,
  MoreVertical,
  RotateCcw,
  ScanLine,
  Search,
  Send,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
import {
  MEMBER_QR_PREFIX,
  SCAN_RESULT_VISIBLE_SECONDS,
} from "~/constant/constant";
import { useMembers } from "~/hooks/useMembers";
import { useSabha } from "~/hooks/useSabha";
import {
  clearPendingAttendance,
  hasPendingAttendance,
} from "~/utils/pendingAttendance";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";
import {
  playErrorBuzzer,
  playSuccessSound,
  primeAudio,
} from "~/utils/sound";

// The scanner pulls in html5-qrcode (a few hundred KB) and only runs while the
// scan dialog is open, so it is split out of the attendance route's bundle.
const QrScanner = lazy(() => import("~/components/shared-component/QrScanner"));

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
    markMemberPresent,
  } = useSabha();
  const { groupSelect, fetchGroupSelect } = useMembers();
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

  // QR scanner (mark present by scanning a member's QR code).
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  // Guards against firing multiple present requests while one is in flight.
  const scanBusyRef = useRef(false);
  // Timer that auto-hides a successful scan result (the member's name).
  const scanResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending auto-hide timer on unmount.
  useEffect(() => {
    return () => {
      if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
    };
  }, []);

  // Set the scan result and play matching audio feedback: the success sound on
  // success, a buzzer on failure. On success the result (member name) auto-hides
  // after SCAN_RESULT_VISIBLE_SECONDS.
  const report = (result: { ok: boolean; message: string }) => {
    // Cancel a previous auto-hide before showing the new result.
    if (scanResultTimerRef.current) {
      clearTimeout(scanResultTimerRef.current);
      scanResultTimerRef.current = null;
    }
    setScanResult(result);
    if (result.ok) {
      playSuccessSound();
      scanResultTimerRef.current = setTimeout(() => {
        setScanResult(null);
        scanResultTimerRef.current = null;
      }, SCAN_RESULT_VISIBLE_SECONDS * 1000);
    } else {
      playErrorBuzzer();
    }
  };

  const handleQrDecoded = async (decodedText: string) => {
    const text = (decodedText || "").trim();
    if (!text.startsWith(MEMBER_QR_PREFIX)) {
      report({
        ok: false,
        message: "Unrecognized QR code. Please scan a member QR.",
      });
      return;
    }
    const memberId = Number(text.slice(MEMBER_QR_PREFIX.length));
    if (!memberId || Number.isNaN(memberId)) {
      report({ ok: false, message: "Invalid member QR code." });
      return;
    }
    if (scanBusyRef.current) return;
    scanBusyRef.current = true;
    try {
      const payload = await markMemberPresent(Number(sabhaId), memberId).unwrap();
      const u = payload.users?.find((m) => m.id === memberId);
      const name = u
        ? `${u.first_name} ${u.middle_name ?? ""} ${u.last_name ?? ""}`
            .replace(/\s+/g, " ")
            .trim()
        : `Member #${memberId}`;
      report({ ok: true, message: `${name} is present` });
    } catch {
      report({
        ok: false,
        message: "Could not mark present. Please try again.",
      });
    } finally {
      scanBusyRef.current = false;
    }
  };

  const openScanner = () => {
    // Unlock audio within this user gesture so scan-triggered tones can play.
    primeAudio();
    setScanResult(null);
    setScanOpen(true);
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

            {selectedSabha?.status === "running" && (
              <Send
                size={22}
                onClick={handleSubmitSabha}
                className="cursor-pointer"
              />
            )}

            {/* Scan QR to mark present - hidden from the UI (kept for future use).
            <ScanLine
              size={22}
              onClick={openScanner}
              className="cursor-pointer"
              aria-label="Scan QR code"
            />
            */}

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
        {/* Summary Counts */}
        <div className="flex shrink-0 justify-around items-center p-2 shadow-sm">
          <div
            className="flex flex-col items-center cursor-pointer"
            onClick={async () => {
              await syncAttendance();
              const newFilter =
                userFilter === "present" ? undefined : "present";
              setUserFilter(newFilter);
              fetchSabhaById(Number(sabhaId), newFilter, selectedGroupId);
            }}
          >
            <span className="text-3xl text-green-500 font-medium font-poppins">
              {totalPresentOnSelectedSabha}
            </span>
            <span className="text-base text-textColor font-medium font-poppins">
              Present
            </span>
          </div>

          <div
            className="flex flex-col items-center cursor-pointer"
            onClick={async () => {
              await syncAttendance();
              const newFilter = userFilter === "absent" ? undefined : "absent";
              setUserFilter(newFilter);
              fetchSabhaById(Number(sabhaId), newFilter, selectedGroupId);
            }}
          >
            <span className="text-3xl text-red-500 font-medium font-poppins">
              {selectedSabha?.status !== "completed"
                ? totalAbsentOnSelectedSabha
                : totalMembersOnSelectedSabha - totalPresentOnSelectedSabha}
            </span>
            <span className="text-base text-textColor font-medium font-poppins">
              Absent
            </span>
          </div>
        </div>

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

      {/* QR Scanner Dialog */}
      <Dialog
        open={scanOpen}
        onOpenChange={(v) => {
          setScanOpen(v);
          if (!v) setScanResult(null);
        }}
      >
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="text-textColor font-semibold">
              Scan Member QR
            </DialogTitle>
          </DialogHeader>

          {/* Mounting only while open starts/stops the camera with the dialog. */}
          {scanOpen && (
            <Suspense
              fallback={
                <p className="py-6 text-center text-sm text-textLightColor">
                  Starting camera…
                </p>
              }
            >
              <QrScanner onScan={handleQrDecoded} />
            </Suspense>
          )}

          {/* Simple result message shown below the scanner. */}
          {scanResult && (
            <p
              className={
                scanResult.ok
                  ? "mt-3 rounded-md bg-green-100 px-3 py-2 text-center text-sm font-medium text-green-700"
                  : "mt-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm font-medium text-red-700"
              }
            >
              {scanResult.ok ? `✓ ${scanResult.message}` : scanResult.message}
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setScanOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  );
}
