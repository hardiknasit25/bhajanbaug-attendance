import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import InputController from "../formController.tsx/InputController";
import SubmitButton from "../shared-component/SubmitButton";

import { useSabha } from "~/hooks/useSabha";
import { useEffect } from "react";
import SelectController from "../formController.tsx/SelectController";

// karyakar_sabha lists everyone mapped into a Karyakar group.
export type SabhaType = "yuva_sabha" | "group_sabha" | "karyakar_sabha";

// Zod Schema
const sabhaFormSchema = z.object({
  sabhaName: z.string().min(1, "Sabha name is required"),
  sabhaType: z.string().refine(
    (value) => {
      const validTypes = ["yuva_sabha", "group_sabha", "karyakar_sabha"];
      return validTypes.includes(value);
    },
    {
      message: "Invalid sabha type",
    },
  ),
});

type SabhaFormData = z.infer<typeof sabhaFormSchema>;

export default function SabhaFormDialog() {
  const {
    selectedSabha,
    sabhaFormDialog,
    closeSabhaFormDailog,
    createSabha,
    updateSabha,
  } = useSabha();

  // Default title: "Yuva Sabha - dd/mm/yyyy" (today's date)
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const DEFAULT_NAME = `Yuva Sabha - ${dd}/${mm}/${yyyy}`;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<SabhaFormData>({
    resolver: zodResolver(sabhaFormSchema),
    defaultValues: {
      sabhaName: selectedSabha ? selectedSabha?.title : DEFAULT_NAME,
      sabhaType: "yuva_sabha",
    },
  });

  const onSubmit = (data: SabhaFormData) => {
    console.log("Form Data:", data);
    const title = data.sabhaName;
    if (!selectedSabha) {
      createSabha(title, data.sabhaType as SabhaType);
    } else {
      updateSabha(selectedSabha.id, title, data.sabhaType as SabhaType);
    }
    reset({
      sabhaName: DEFAULT_NAME,
      sabhaType: "yuva_sabha",
    });
  };

  const handleCancel = () => {
    reset({
      sabhaName: DEFAULT_NAME,
      sabhaType: "yuva_sabha",
    });
    closeSabhaFormDailog();
  };

  useEffect(() => {
    if (selectedSabha) {
      setValue("sabhaName", selectedSabha?.title);
      setValue("sabhaType", selectedSabha?.sabha_type || "yuva_sabha");
    }
  }, [selectedSabha]);

  return (
    <Dialog open={sabhaFormDialog} onOpenChange={handleCancel}>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-textColor font-semibold">
            {selectedSabha ? "Update" : "Create New"} Sabha
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <InputController
            name="sabhaName"
            control={control}
            label="Sabha Name"
            placeholder="Enter sabha name"
            required
          />

          <SelectController
            name="sabhaType"
            control={control}
            label="Select Sabha"
            options={[
              { label: "Yuva Sabha", value: "yuva_sabha" },
              { label: "Group Sabha", value: "group_sabha" },
              { label: "Karyakar Sabha", value: "karyakar_sabha" },
            ]}
          />

          <DialogFooter className="flex flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <SubmitButton
              buttonText={selectedSabha ? "Update" : "Create"}
              loadingButtonText="Creating..."
              loading={isSubmitting}
              className="flex-1"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
