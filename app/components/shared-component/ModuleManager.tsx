import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "~/components/shared-component/DataTable";
import {
  EnumFilter,
  EnumFloatingFilter,
  type EnumFilterOption,
} from "~/components/shared-component/EnumFilter";
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
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { usePermission } from "~/hooks/usePermissions";
import { useViewMode } from "~/hooks/useViewMode";
import { moduleService } from "~/services/moduleService";
import type { ModuleItem, ModuleType } from "~/types/module.interface";

// Modules tab: list + create/edit/delete modules.
export default function ModuleManager() {
  const { canCreate, canUpdate, canDelete } = usePermission("module");

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // null = closed; { } = create; { module } = edit
  const [formState, setFormState] = useState<{ module?: ModuleItem } | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ModuleType>("user");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [moduleToDelete, setModuleToDelete] = useState<ModuleItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useViewMode("modules");

  // module type is a fixed enum in the database — filter offers exactly those values.
  const MODULE_TYPE_OPTIONS: EnumFilterOption[] = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
  ];

  // Table-view columns (actions mirror the card buttons).
  const columnDefs = useMemo<ColDef<ModuleItem>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        minWidth: 130,
        filter: true,
        floatingFilter: true,
      },
      {
        field: "key",
        headerName: "Key",
        minWidth: 130,
        filter: true,
        floatingFilter: true,
      },
      {
        field: "type",
        headerName: "Type",
        minWidth: 100,
        valueFormatter: (p) => p.value || "—",
        filter: EnumFilter,
        filterParams: { field: "type", options: MODULE_TYPE_OPTIONS },
        floatingFilter: true,
        floatingFilterComponent: EnumFloatingFilter,
        floatingFilterComponentParams: { options: MODULE_TYPE_OPTIONS },
      },
      {
        headerName: "Actions",
        sortable: false,
        resizable: false,
        minWidth: 110,
        maxWidth: 120,
        cellRenderer: (params: ICellRendererParams<ModuleItem>) => {
          const m = params.data;
          if (!m) return null;
          return (
            <div className="flex h-full items-center gap-1">
              {canUpdate && (
                <button
                  type="button"
                  onClick={() => setFormState({ module: m })}
                  aria-label={`Edit ${m.name}`}
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
                    setModuleToDelete(m);
                  }}
                  aria-label={`Delete ${m.name}`}
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

  const loadModules = async () => {
    setLoading(true);
    try {
      const res = await moduleService.getModules();
      setModules((res?.data ?? []) as ModuleItem[]);
    } catch {
      // The API returns 400 when there are no modules — treat as empty.
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  // Sync the form fields whenever the create/edit dialog opens.
  useEffect(() => {
    if (formState) {
      setName(formState.module?.name ?? "");
      setType((formState.module?.type as ModuleType) ?? "user");
      setFormError(null);
    }
  }, [formState]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Module name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (formState?.module) {
        await moduleService.updateModule(formState.module.id, { name: trimmed, type });
      } else {
        await moduleService.createModule({ name: trimmed, type });
      }
      setFormState(null);
      await loadModules();
    } catch (error: any) {
      setFormError(
        error?.response?.data?.message ||
          error?.message ||
          "Could not save the module."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!moduleToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await moduleService.deleteModule(moduleToDelete.id);
      setModuleToDelete(null);
      await loadModules();
    } catch (error: any) {
      setDeleteError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to delete this module."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-textLightColor">
          Total {modules.length} Modules
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
              <span className="uppercase">Add Module</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : modules.length === 0 ? (
        <div className="mt-8 text-center text-textLightColor">No modules found</div>
      ) : viewMode === "table" ? (
        <DataTable
          rowData={modules}
          columnDefs={columnDefs}
          stateKey="modules"
        />
      ) : (
        modules.map((m) => (
          <div
            key={m.id}
            className="w-full rounded-xl border border-borderColor bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <h3 className="text-base font-semibold capitalize text-textColor">
                  {m.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-xs text-textLightColor">
                    {m.key}
                  </span>
                  {m.type && (
                    <span className="rounded-full bg-eventCardColor px-2.5 py-0.5 text-xs font-medium capitalize text-eventCardBorderColor">
                      {m.type}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => setFormState({ module: m })}
                    aria-label={`Edit ${m.name}`}
                    className="flex size-9 items-center justify-center rounded-full text-textLightColor transition-colors hover:bg-gray-100 hover:text-primaryColor"
                  >
                    <Pencil size={18} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setModuleToDelete(m);
                    }}
                    aria-label={`Delete ${m.name}`}
                    className="flex size-9 items-center justify-center rounded-full text-deleteButtonColor transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Create / edit module */}
      <Dialog open={!!formState} onOpenChange={(open) => !open && setFormState(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-textColor">
              {formState?.module ? "Edit Module" : "Create Module"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textColor">
                Module Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter module name"
                className="w-full rounded-lg border border-borderColor bg-white px-3 py-2 text-sm text-textColor outline-none placeholder:text-textLightColor focus:border-primaryColor"
              />
              <p className="text-xs text-textLightColor">
                A key is generated from the name (e.g. "Poshak Group" → poshak_group).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-textColor">Type</label>
              <RadioGroup
                value={type}
                onValueChange={(val) => setType(val as ModuleType)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="user" id="module-type-user" />
                  <label htmlFor="module-type-user">User</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="admin" id="module-type-admin" />
                  <label htmlFor="module-type-admin">Admin</label>
                </div>
              </RadioGroup>
            </div>

            {formError && <p className="text-sm text-errorColor">{formError}</p>}
          </div>

          <DialogFooter className="flex flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setFormState(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : formState?.module
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!moduleToDelete}
        onOpenChange={(open) => !open && setModuleToDelete(null)}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-textColor">Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{moduleToDelete?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && <p className="text-sm text-errorColor">{deleteError}</p>}

          <DialogFooter className="flex flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setModuleToDelete(null)}
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
