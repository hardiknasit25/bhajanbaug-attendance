import { Link, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import type { SabhaData } from "~/types/sabha.interface";
import CircularProgress from "./CircularProgress";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useSabha } from "~/hooks/useSabha";
import { CalendarDays, Check, ChevronRight, Pencil, Trash2, X } from "lucide-react";

function EventCard({ sabha }: { sabha: SabhaData }) {
  const navigate = useNavigate();
  const status = sabha?.status;
  const totalPresents = sabha?.total_present ?? 0;
  const totalUsers = sabha?.total_users ?? 0;
  const totalAbsents = totalUsers - totalPresents;
  const attendancePercentage =
    totalUsers > 0 ? Math.round((totalPresents / totalUsers) * 100) : 0;
  const { startSabha, openSabhaFormDialog, deleteSabha } = useSabha();

  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between bg-eventCardColor rounded-xl shadow-sm overflow-hidden border-l-4 px-4 cursor-pointer",
        status === "upcoming" && "bg-blue-400/10 border-l-blue-500",
        status === "completed" && "bg-green-400/10 border-l-green-500",
        status === "running" && "bg-orange-400/10 border-l-orange-500"
      )}
      onClick={(e) => {
        // If click originated from the Start/Join/Completed button → let the button handle it
        if ((e.target as HTMLElement).closest("button")) return;

        // Upcoming → open the edit dialog (unchanged behavior).
        if (sabha?.status === "upcoming") {
          openSabhaFormDialog(sabha);
          return;
        }

        // Completed / running → navigate to the attendance view, same as the status button.
        navigate(`/sabha/attendance/${sabha.id}`);
      }}
    >
      <div className="w-full flex items-center justify-between gap-3">
        {/* Content */}
        <div className="flex flex-col flex-1 py-3 min-w-0">
          <div className="flex justify-start items-center gap-2">
            <h2 className="font-semibold text-base text-textColor capitalize truncate">
              {sabha?.title}
            </h2>
          </div>
          <p className="text-sm text-textLightColor flex items-center gap-1.5">
            {status === "completed" && <CalendarDays size={13} />}
            {sabha?.sabha_date}
          </p>
        </div>

        {/* Start Button */}
        <div className="flex justify-center items-center gap-4">
          {status === "completed" && (
            <div className="flex items-center gap-1">
              <CircularProgress
                size={52}
                strokeWidth={5}
                value={attendancePercentage}
              />
              <ChevronRight size={18} className="text-textLightColor" />
            </div>
          )}
          {status === "upcoming" && (
            <>
              <Pencil size={16} />
              <button
                type="button"
                aria-label="Delete sabha"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDeleteOpen(true);
                }}
                className="text-redTextColor z-20"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          {status !== "completed" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (status === "running") {
                  return navigate(`/sabha/attendance/${sabha.id}`);
                }
                setOpen(true);
              }}
              className={cn(
                "block px-5 py-2 text-sm text-white font-medium rounded-full z-20",
                status === "upcoming" && "bg-blue-500",
                status === "running" && "bg-orange-500"
              )}
            >
              {status === "upcoming" ? "Start" : "Join"}
            </button>
          )}
        </div>
      </div>

      {status === "completed" && (
        <div className="w-full flex flex-col gap-2 pb-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-red-500/20">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${attendancePercentage}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-greenTextColor">
              <Check size={12} strokeWidth={3} />
              {totalPresents} Present
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-redTextColor">
              <X size={12} strokeWidth={3} />
              {totalAbsents} Absent
            </span>
            <span className="ml-auto text-xs text-textLightColor">
              {totalUsers} total
            </span>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {status === "upcoming" ? "Start Sabha?" : "Join Sabha?"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {status === "upcoming" ? "start" : "join"} this sabha?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-center items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button
              onClick={() => {
                startSabha(sabha.id); // ⬅ wait for API
                setOpen(false);
                navigate(`/sabha/attendance/${sabha.id}`);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sabha?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{sabha?.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-center items-center gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>

            <Button
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                deleteSabha(sabha.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EventCard;
