import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  redirect,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaArgs,
} from "react-router";
import DataTable from "~/components/shared-component/DataTable";
import {
  EnumFilter,
  EnumFloatingFilter,
  type EnumFilterOption,
} from "~/components/shared-component/EnumFilter";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import LoadingSpinner from "~/components/shared-component/LoadingSpinner";
import RoleListCard from "~/components/shared-component/RoleListCard";
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
import { useMyPermissions } from "~/hooks/usePermissions";
import { usePersistedSearch } from "~/hooks/usePersistedSearch";
import { useRoles } from "~/hooks/useRoles";
import { useViewMode } from "~/hooks/useViewMode";
import type { Role } from "~/types/role.interface";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export function meta({}: MetaArgs) {
  return [
    { title: "User Role" },
    { name: "description", content: "Manage user roles" },
  ];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);
  if (!token) return redirect("/login");
  return null;
};

export default function RolesPage() {
  const navigate = useNavigate();
  const {
    filteredRoles,
    loading,
    searchText,
    fetchRoles,
    setSearchText,
    deleteRole,
  } = useRoles();
  const { can } = useMyPermissions();

  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useViewMode("roles");

  const canEdit = can("role", "update");
  const canDelete = can("role", "delete");

  // Fixed enums in the database — filters offer exactly those values.
  const USER_TYPE_OPTIONS: EnumFilterOption[] = [
    { value: "admin", label: "Admin" },
    { value: "user", label: "User" },
  ];
  const YES_NO_OPTIONS: EnumFilterOption[] = [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ];

  // Table-view columns (actions mirror the card buttons).
  const columnDefs = useMemo<ColDef<Role>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        minWidth: 130,
        filter: true,
        floatingFilter: true,
      },
      {
        field: "user_type",
        headerName: "User Type",
        minWidth: 110,
        filter: EnumFilter,
        filterParams: { field: "user_type", options: USER_TYPE_OPTIONS },
        floatingFilter: true,
        floatingFilterComponent: EnumFloatingFilter,
        floatingFilterComponentParams: { options: USER_TYPE_OPTIONS },
      },
      {
        field: "role_level",
        headerName: "Level",
        minWidth: 90,
        filter: "agNumberColumnFilter",
        floatingFilter: true,
      },
      {
        field: "same_level_edit",
        headerName: "Same Level Edit",
        minWidth: 130,
        valueFormatter: (p) => (p.value ? "Yes" : "No"),
        filter: EnumFilter,
        filterParams: { field: "same_level_edit", options: YES_NO_OPTIONS },
        floatingFilter: true,
        floatingFilterComponent: EnumFloatingFilter,
        floatingFilterComponentParams: { options: YES_NO_OPTIONS },
      },
      {
        headerName: "Actions",
        sortable: false,
        resizable: false,
        minWidth: 110,
        maxWidth: 120,
        cellRenderer: (params: ICellRendererParams<Role>) => {
          const role = params.data;
          if (!role) return null;
          return (
            <div className="flex h-full items-center gap-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/role/update/${role.id}`)}
                  aria-label={`Edit ${role.name}`}
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
                    setRoleToDelete(role);
                  }}
                  aria-label={`Delete ${role.name}`}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, canDelete]
  );

  // Search survives navigation/reloads (view mode & table filters do too).
  usePersistedSearch("roles", searchText, setSearchText);

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteRole(roleToDelete.id).unwrap();
      setRoleToDelete(null);
    } catch (error) {
      setDeleteError(
        typeof error === "string" ? error : "Unable to delete this role."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <LayoutWrapper
      headerConfigs={{
        title: "User Role",
        className: "flex-col gap-2",
        description: `Total ${filteredRoles.length} Roles`,
        showSearch: true,
        searchPlaceholder: "Search roles...",
        searchValue: searchText,
        onSearchChange: setSearchText,
        children: can("role", "create") ? (
          <button
            type="button"
            onClick={() => navigate("/role/create")}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-primaryColor"
          >
            <Plus size={18} />
            <span className="uppercase">Add</span>
          </button>
        ) : undefined,
      }}
      className="p-4"
    >
      <div className="mb-3 flex justify-end">
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredRoles.length === 0 ? (
        <div className="mt-10 text-center text-textLightColor">
          No roles found
        </div>
      ) : viewMode === "table" ? (
        <DataTable
          rowData={filteredRoles}
          columnDefs={columnDefs}
          stateKey="roles"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredRoles.map((role) => (
            <RoleListCard
              key={role.id}
              role={role}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={(r) => navigate(`/role/update/${r.id}`)}
              onDelete={(r) => {
                setDeleteError(null);
                setRoleToDelete(r);
              }}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={!!roleToDelete}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-textColor">Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{roleToDelete?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="text-sm text-errorColor">{deleteError}</p>
          )}

          <DialogFooter className="flex flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setRoleToDelete(null)}
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
    </LayoutWrapper>
  );
}
