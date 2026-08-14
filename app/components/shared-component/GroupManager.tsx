import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { POSHAK_GROUP_TYPES } from "~/constant/constant";
import {
  EnumFilter,
  EnumFloatingFilter,
  type EnumFilterOption,
} from "~/components/shared-component/EnumFilter";
import GroupForm from "~/components/forms/GroupForm";
import DataTable from "~/components/shared-component/DataTable";
import GroupListCard from "~/components/shared-component/GroupListCard";
import LoadingSpinner from "~/components/shared-component/LoadingSpinner";
import ViewToggle from "~/components/shared-component/ViewToggle";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useGroups } from "~/hooks/useGroups";
import { useMembers } from "~/hooks/useMembers";
import { usePermission } from "~/hooks/usePermissions";
import { usePersistedSearch } from "~/hooks/usePersistedSearch";
import { useViewMode } from "~/hooks/useViewMode";
import type { GroupData } from "~/types/group.interface";

// group_type is a fixed enum in the database — filter offers exactly those values.
const GROUP_TYPE_OPTIONS: EnumFilterOption[] = POSHAK_GROUP_TYPES.map((t) => ({
  value: t.key,
  label: t.label,
}));

// Groups tab: list + create/edit (GroupForm in a dialog) + delete.
export default function GroupManager() {
  const { groups, loading, searchText, fetchGroups, deleteGroup, setSearchText } =
    useGroups();
  // The groups list API may not include leader_name (older backend); the
  // /poshak-group/select endpoint always resolves it, so merge from there.
  const { groupSelect, fetchGroupSelect } = useMembers();
  const { canCreate, canUpdate, canDelete } = usePermission("poshak_group");
  const [viewMode, setViewMode] = useViewMode("groups");

  // null = closed; { } = create; { group } = edit
  const [formState, setFormState] = useState<{ group?: GroupData } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<GroupData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Search survives navigation/reloads (view mode & table filters do too).
  usePersistedSearch("groups", searchText, setSearchText);

  useEffect(() => {
    fetchGroups();
    fetchGroupSelect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch after create/update so leader_name (resolved server-side) shows up.
  const handleFormSuccess = () => {
    setFormState(null);
    fetchGroups();
    fetchGroupSelect();
  };

  // Fill in missing leader names from the select endpoint.
  const enrichedGroups = useMemo(() => {
    const leaderById = new Map(groupSelect.map((g) => [g.id, g.leader_name]));
    return groups.map((g) => ({
      ...g,
      leader_name: g.leader_name || leaderById.get(g.id) || null,
    }));
  }, [groups, groupSelect]);

  // Search across leader name, group name, and type (drives the header search).
  const visibleGroups = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return enrichedGroups;
    return enrichedGroups.filter(
      (g) =>
        g.leader_name?.toLowerCase().includes(q) ||
        g.group_name?.toLowerCase().includes(q) ||
        g.group_type?.toLowerCase().includes(q)
    );
  }, [enrichedGroups, searchText]);

  // Table-view columns (actions mirror the card buttons). Each data column has
  // its own AG Grid filter (funnel row below the header).
  const columnDefs = useMemo<ColDef<GroupData>[]>(
    () => [
      {
        field: "leader_name",
        headerName: "Leader Name",
        minWidth: 170,
        filter: true,
        floatingFilter: true,
        valueFormatter: (p) => p.value || "—",
      },
      {
        field: "group_type",
        headerName: "Type",
        minWidth: 110,
        filter: EnumFilter,
        filterParams: { field: "group_type", options: GROUP_TYPE_OPTIONS },
        floatingFilter: true,
        floatingFilterComponent: EnumFloatingFilter,
        floatingFilterComponentParams: { options: GROUP_TYPE_OPTIONS },
      },
      {
        field: "group_name",
        headerName: "Group Name",
        minWidth: 170,
        filter: true,
        floatingFilter: true,
        cellRenderer: (params: ICellRendererParams<GroupData>) => {
          const group = params.data;
          if (!group) return null;
          return (
            <div className="flex h-full flex-col justify-center leading-tight">
              <span className="text-sm font-medium capitalize text-textColor">
                {group.group_name}
              </span>
              <span className="text-xs capitalize text-textLightColor">
                {group.group_type}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        sortable: false,
        resizable: false,
        minWidth: 110,
        maxWidth: 120,
        cellRenderer: (params: ICellRendererParams<GroupData>) => {
          const group = params.data;
          if (!group) return null;
          return (
            <div className="flex h-full items-center gap-1">
              {canUpdate && (
                <button
                  type="button"
                  onClick={() => setFormState({ group })}
                  aria-label={`Edit ${group.group_name}`}
                  className="flex size-8 items-center justify-center rounded-full text-textLightColor transition-colors hover:bg-gray-100 hover:text-primaryColor"
                >
                  <Pencil size={16} />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setGroupToDelete(group);
                  }}
                  aria-label={`Delete ${group.group_name}`}
                  className="flex size-8 items-center justify-center rounded-full text-deleteButtonColor transition-colors hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [canUpdate, canDelete]
  );

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteGroup(groupToDelete.id).unwrap();
      setGroupToDelete(null);
    } catch (error) {
      setDeleteError(
        typeof error === "string" ? error : "Unable to delete this group."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-textLightColor">
          Total {visibleGroups.length} Groups
        </span>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {canCreate && (
            <button
              type="button"
              onClick={() => setFormState({})}
              className="flex items-center gap-1 rounded-full bg-primaryColor px-3 py-1.5 text-sm font-medium text-white"
            >
              <Plus size={16} />
              <span className="uppercase">Add Group</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : visibleGroups.length === 0 ? (
        <div className="mt-8 text-center text-textLightColor">
          No groups found
        </div>
      ) : viewMode === "table" ? (
        <DataTable
          rowData={visibleGroups}
          columnDefs={columnDefs}
          rowHeight={56}
          stateKey="groups"
        />
      ) : (
        visibleGroups.map((group) => (
          <GroupListCard
            key={group.id}
            group={group}
            canEdit={canUpdate}
            canDelete={canDelete}
            onEdit={(g) => setFormState({ group: g })}
            onDelete={(g) => {
              setDeleteError(null);
              setGroupToDelete(g);
            }}
          />
        ))
      )}

      {/* Create / edit group */}
      <Dialog
        open={!!formState}
        onOpenChange={(open) => !open && setFormState(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-textColor">
              {formState?.group ? "Edit Group" : "Create Group"}
            </DialogTitle>
          </DialogHeader>
          {formState && (
            <GroupForm
              mode={formState.group ? "update" : "create"}
              initialData={formState.group}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!groupToDelete}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-textColor">Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{groupToDelete?.group_name}</span>
              ? Members mapped to this group will lose it.
            </DialogDescription>
          </DialogHeader>

          {deleteError && <p className="text-sm text-errorColor">{deleteError}</p>}

          <DialogFooter className="flex flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setGroupToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-full bg-deleteButtonColor text-white hover:bg-deleteButtonColor/90"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
