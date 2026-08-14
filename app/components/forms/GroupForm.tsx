import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { POSHAK_GROUP_TYPES } from "~/constant/constant";
import { useGroups } from "~/hooks/useGroups";
import { useMembers } from "~/hooks/useMembers";
import { cn } from "~/lib/utils";
import { groupSchema, type GroupFormData } from "~/schemas/groupSchema";
import type { GroupData, GroupPayload } from "~/types/group.interface";
import ChipController from "../formController.tsx/ChipController";
import InputController from "../formController.tsx/InputController";
import ErrorMessage from "../shared-component/ErrorMessage";
import { toast } from "../shared-component/Toaster";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface GroupFormProps {
  mode?: "create" | "update";
  initialData?: GroupData;
  // Called after a successful save — lets the form live inside a dialog.
  onSuccess?: () => void;
}

function GroupForm({ mode = "create", initialData, onSuccess }: GroupFormProps) {
  const { createGroup, updateGroup } = useGroups();
  const { members, fetchMembers } = useMembers();
  const [serverError, setServerError] = useState<string | null>(null);
  const [leaderOpen, setLeaderOpen] = useState(false);

  // Leader picker options come from the full member list.
  useEffect(() => {
    if (!members.length) fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaderOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: [m.first_name, m.middle_name, m.last_name]
          .filter(Boolean)
          .join(" "),
        smk_no: m.smk_no,
      })),
    [members]
  );

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      group_name: initialData?.group_name ?? "",
      group_type: (initialData?.group_type as GroupFormData["group_type"]) ?? "poshak",
      poshak_leader_id: initialData?.poshak_leader_id ?? undefined,
    },
  }) as any;

  const handleFormSubmit: SubmitHandler<any> = async (data: GroupFormData) => {
    setServerError(null);
    const payload: GroupPayload = {
      group_name: data.group_name,
      group_type: data.group_type,
      poshak_leader_id: data.poshak_leader_id as number,
    };

    try {
      if (mode === "create") {
        await createGroup(payload).unwrap();
        toast.success("Group created successfully");
      } else if (initialData) {
        await updateGroup(initialData.id, payload).unwrap();
        toast.success("Group updated successfully");
      }
      onSuccess?.();
    } catch (error) {
      setServerError(
        typeof error === "string"
          ? error
          : "Something went wrong. Please try again."
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="w-full space-y-4 pb-4"
    >
      <InputController
        name="group_name"
        control={control}
        label="Group Name"
        placeholder="Enter group name"
        required
      />

      <ChipController
        name="group_type"
        control={control}
        label="Group Type"
        options={POSHAK_GROUP_TYPES.map((t) => ({
          value: t.key,
          label: t.label,
        }))}
        multi={false}
        required
      />

      {/* Poshak leader — searchable single select over all members */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-textColor">
          Poshak Leader
        </label>
        <Controller
          name="poshak_leader_id"
          control={control}
          render={({ field, fieldState: { error } }) => {
            const selected = leaderOptions.find(
              (opt) => opt.value === field.value
            );
            return (
              <>
                <Popover open={leaderOpen} onOpenChange={setLeaderOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex w-full justify-between p-1.5 px-2"
                    >
                      <span
                        className={cn(
                          "line-clamp-1 flex w-full justify-start font-normal",
                          !selected && "text-textLightColor"
                        )}
                      >
                        {selected ? selected.label : "Select poshak leader"}
                      </span>
                      <ChevronsUpDown className="ml-1 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="!w-full p-0">
                    <Command className="w-full">
                      <CommandInput placeholder="Search member..." />
                      <CommandList className="w-full">
                        <CommandEmpty>No member found</CommandEmpty>
                        <CommandGroup className="w-full">
                          {leaderOptions.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              value={`${opt.label} ${opt.smk_no ?? ""}`}
                              onSelect={() => {
                                field.onChange(opt.value);
                                setLeaderOpen(false);
                              }}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <Check
                                size={16}
                                className={cn(
                                  field.value === opt.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span>{opt.label}</span>
                              {opt.smk_no && (
                                <span className="text-xs text-textLightColor">
                                  ({opt.smk_no})
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {error && <ErrorMessage error={error.message as string} />}
              </>
            );
          }}
        />
      </div>

      {serverError && <ErrorMessage error={serverError} />}

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full rounded-full bg-primaryColor px-4 py-2 font-medium text-white transition-colors duration-200",
            isSubmitting && "cursor-not-allowed opacity-60"
          )}
        >
          {mode === "create"
            ? isSubmitting
              ? "Creating..."
              : "Create Group"
            : isSubmitting
              ? "Updating..."
              : "Update Group"}
        </button>
      </div>
    </form>
  );
}

export default GroupForm;
