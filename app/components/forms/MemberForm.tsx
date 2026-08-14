import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useMembers } from "~/hooks/useMembers";
import { cn } from "~/lib/utils";
import { userCreateSchema, type UserCreateFormData } from "~/schemas/memberSchema";
import type { MemberData, MemberPayload } from "~/types/members.interface";
import ChipController from "../formController.tsx/ChipController";
import DatePickerController from "../formController.tsx/DatePickerController";
import InputController from "../formController.tsx/InputController";
import MultiSelect from "../formController.tsx/MultiSelect";
import TextAreaController from "../formController.tsx/TextAreaController";
import ErrorMessage from "../shared-component/ErrorMessage";
import { toast } from "../shared-component/Toaster";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Spinner } from "../ui/spinner";
import { useNavigate } from "react-router";

interface MemberFormProps {
  mode?: "create" | "update";
  initialData?: MemberData;
}

const occupationOptions = [
  { value: "job", label: "Job" },
  { value: "study", label: "Study" },
  { value: "business", label: "Business" },
];

function MemberForm({ mode = "create", initialData }: MemberFormProps) {
  const { groupSelect, fetchGroupSelect, createMember, updateMember } = useMembers();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // In "create" mode only the minimal fields are shown; the rest are revealed in
  // "update" mode (so the full user record can be edited).
  const isUpdate = mode === "update";

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      first_name: initialData?.first_name || undefined,
      middle_name: initialData?.middle_name || undefined,
      last_name: initialData?.last_name || undefined,
      user_type: (initialData as any)?.user_type || "yuva",
      email: initialData?.email || null,
      mobile: initialData?.mobile || undefined,
      birth_day: initialData?.birth_day || null,
      satsang_day: initialData?.satsang_day || null,
      mulgam: initialData?.mulgam || null,
      smk_no: initialData?.smk_no || null,
      address: initialData?.address || null,
      is_married: (initialData?.is_married || false) ?? undefined,
      is_family_leader: initialData?.is_family_leader ?? undefined,
      is_seva: (initialData?.is_seva || false) ?? undefined,
      occupation: initialData?.occupation,
      occupation_field: initialData?.occupation_field || null,
      seva: initialData?.seva || null,
      parichit_bhakat_name: initialData?.parichit_bhakat_name || null,
      is_smruti: initialData?.is_smruti ?? undefined,
      group_id: initialData?.group_id || [],
      family_leader_id: initialData?.family_leader_id ?? null,
    },
  }) as any;

  const handleFormSubmit: SubmitHandler<any> = async (data: UserCreateFormData) => {
    const payload: MemberPayload = {
      ...data,
      is_job: data.occupation === "job",
      family_leader_id: data.family_leader_id !== undefined && data.family_leader_id !== null ? data.family_leader_id : null,
    };
    setSubmitError(null);
    try {
      if (mode === "create") {
        await createMember(payload).unwrap();
        toast.success("Member created successfully");
        navigate(`/members`);
      } else {
        await updateMember(initialData?.id as number, payload).unwrap();
        toast.success("Member updated successfully");
        navigate(`/members/details/${initialData?.id}`);
      }
    } catch (error) {
      const message =
        typeof error === "string"
          ? error
          : `Failed to ${mode === "create" ? "create" : "update"} member. Please try again.`;
      setSubmitError(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    fetchGroupSelect();
  }, []);

  return (
    <div className="w-full h-full">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="w-full space-y-4 pb-4">
        {/* --- Minimal fields (shown in both create & update) --- */}
        <InputController name="first_name" control={control} label="First Name" placeholder="Enter first name" required />

        <InputController name="middle_name" control={control} label="Middle Name" placeholder="Enter middle name" required />

        <InputController name="last_name" control={control} label="Last Name" placeholder="Enter last name" required />

        <ChipController
          name="user_type"
          control={control}
          label="User Type"
          options={[
            { value: "yuva", label: "Yuva" },
            { value: "group", label: "Group" },
          ]}
          multi={false}
          required
        />

        <InputController name="mobile" control={control} label="Mobile Number" placeholder="Enter 10 digit mobile number" required />

        {/* poshak leader (optional) */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium">Select Poshak Group Leader</label>

          <Controller
            name="group_id"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                <MultiSelect
                  options={groupSelect.map((group) => ({
                    value: String(group.id),
                    label: group.leader_name,
                  }))}
                  value={(field.value || []).map(String)}
                  onChange={(val) => field.onChange(val.map(Number))}
                  placeholder="Select group leaders"
                  searchPlaceholder="Search leader name..."
                />
                {error && <ErrorMessage error={error.message as string} />}
              </>
            )}
          />
        </div>

        <InputController name="parichit_bhakat_name" control={control} label="Parichit Bhakt Name" placeholder="Enter parichit bhakt name" />

        {/* --- Additional fields (only when updating an existing member) --- */}
        {isUpdate && (
          <>
            <InputController name="email" control={control} label="Email" type="email" placeholder="Enter email address" />

            <InputController name="smk_no" control={control} label="SMK Number" placeholder="Enter SMK number" />

            <DatePickerController name="birth_day" control={control} label="Birth Date" placeholder="Select birth date" disablePastDates={false} />

            <DatePickerController name="satsang_day" control={control} label="Satsang Day" placeholder="Select satsang day" disablePastDates={false} />

            <InputController name="mulgam" control={control} label="Mulgam" placeholder="Enter mulgam" />

            <TextAreaController name="address" control={control} label="Address" placeholder="Enter full address" rows={3} />

            {/* Family Status Section */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium">Married?</label>
              <Controller
                name="is_married"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <RadioGroup
                      value={field.value === true ? "yes" : field.value === false ? "no" : undefined}
                      onValueChange={(val) => field.onChange(val === "yes")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="yes" id="married-yes" />
                        <label htmlFor="married-yes">Yes</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="no" id="married-no" />
                        <label htmlFor="married-no">No</label>
                      </div>
                    </RadioGroup>
                    {error && <ErrorMessage error={error.message as string} />}
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium">Family Leader?</label>
              <Controller
                name="is_family_leader"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <RadioGroup
                      value={field.value === true ? "yes" : field.value === false ? "no" : undefined}
                      onValueChange={(val) => field.onChange(val === "yes")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="yes" id="family-leader-yes" />
                        <label htmlFor="family-leader-yes">Yes</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="no" id="family-leader-no" />
                        <label htmlFor="family-leader-no">No</label>
                      </div>
                    </RadioGroup>
                    {error && <ErrorMessage error={error.message as string} />}
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium">Is Smruti User?</label>
              <Controller
                name="is_smruti"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <RadioGroup
                      value={field.value === true ? "yes" : field.value === false ? "no" : undefined}
                      onValueChange={(val) => field.onChange(val === "yes")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="yes" id="smruti-yes" />
                        <label htmlFor="smruti-yes">Yes</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="no" id="smruti-no" />
                        <label htmlFor="smruti-no">No</label>
                      </div>
                    </RadioGroup>
                    {error && <ErrorMessage error={error.message as string} />}
                  </>
                )}
              />
            </div>

            {/* Occupation Section (optional) */}
            <ChipController name="occupation" control={control} label="Occupation Type" options={occupationOptions} multi={false} />

            <InputController name="occupation_field" control={control} label="Occupation Field" placeholder="Enter occupation field" />

            {/* Seva Section */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium">Seva?</label>
              <Controller
                name="is_seva"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <RadioGroup
                      value={field.value === true ? "yes" : field.value === false ? "no" : undefined}
                      onValueChange={(val) => field.onChange(val === "yes")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="yes" id="seva-yes" />
                        <label htmlFor="seva-yes">Yes</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="no" id="seva-no" />
                        <label htmlFor="seva-no">No</label>
                      </div>
                    </RadioGroup>
                    {error && <ErrorMessage error={error.message as string} />}
                  </>
                )}
              />
            </div>

            <TextAreaController name="seva" control={control} label="Seva Details" placeholder="Enter seva details" rows={2} />
          </>
        )}

        {/* Submit Button */}
        <div className="pt-4 space-y-2">
          {submitError && <ErrorMessage error={submitError} />}
          <button type="submit" disabled={isSubmitting} className={cn("w-full flex items-center justify-center gap-2 rounded-full bg-primaryColor text-white font-medium py-2 px-4 transition-colors duration-200", isSubmitting && "opacity-60 cursor-not-allowed")}>
            {isSubmitting && <Spinner />}
            {mode === "create" ? (isSubmitting ? "Creating..." : "Create Member") : isSubmitting ? "Updating..." : "Update Member"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MemberForm;
